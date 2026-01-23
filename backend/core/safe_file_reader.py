"""
Модуль для безопасного чтения файлов с интеграцией retry механизма.
Поддерживает использование локальных методов или удаленного MCP-сервера.
"""

import json
import os
from typing import Any, Dict, List, Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Импорт для MCP-сервера (если установлен)
try:
    from mcp_server.mcp_server import get_server
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    print("MCP server not available, falling back to local file operations")

from .logging import logger


class FileReadError(Exception):
    """
    Исключение для ошибок чтения файлов.
    """
    pass


class SafeFileReader:
    """
    Класс для безопасного чтения файлов с использованием retry механизма.
    Поддерживает как локальные операции, так и использование MCP-сервера.
    """
    
    def __init__(self, use_mcp: bool = True):
        """
        Args:
            use_mcp: Если True, использовать MCP-сервер когда возможно, иначе только локальные операции
        """
        self.use_mcp = use_mcp and MCP_AVAILABLE

    @staticmethod
    def _local_read_file(file_path: str, encoding: str = 'utf-8') -> Optional[str]:
        """Локальное чтение файла"""
        logger.info(f"Начинается локальное чтение файла: {file_path}")
        
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
                logger.info(f"Файл успешно прочитан: {file_path}")
                return content
        except (FileNotFoundError, PermissionError, IOError, OSError) as e:
            logger.error(f"Ошибка при чтении файла {file_path}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Неожиданная ошибка при чтении файла {file_path}: {str(e)}")
            raise

    async def read_file(self, file_path: str, encoding: str = 'utf-8') -> Optional[str]:
        """
        Безопасное чтение содержимого файла с возможностью использования MCP-сервера.

        Args:
            file_path: Путь к файлу
            encoding: Кодировка файла (по умолчанию utf-8)

        Returns:
            Содержимое файла в виде строки или None в случае неудачи
        """
        if self.use_mcp:
            try:
                server = await get_server()
                
                # Подготовка параметров для MCP-запроса
                params = {"path": file_path, "encoding": encoding}
                
                # Вызов MCP-метода
                response = await server.handle_request({
                    "method": "read_file",
                    "params": params,
                    "id": 1
                })
                
                if response.get("result", {}).get("success"):
                    return response["result"]["content"]
                else:
                    error = response.get("result", {}).get("error", {})
                    logger.error(f"MCP read_file error: {error}")
                    # В случае ошибки MCP, fallback на локальное чтение
                    return self._local_read_file(file_path, encoding)
                    
            except Exception as e:
                logger.warning(f"MCP read_file failed, falling back to local: {str(e)}")
                # В случае ошибки при обращении к MCP, fallback на локальное чтение
                return self._local_read_file(file_path, encoding)
        else:
            # Использовать только локальные операции
            return self._local_read_file(file_path, encoding)

    @staticmethod
    def _local_read_json(file_path: str) -> Optional[dict]:
        """Локальное чтение JSON файла"""
        logger.info(f"Начинается локальное чтение JSON файла: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                logger.info(f"JSON файл успешно прочитан: {file_path}")
                return content
        except (FileNotFoundError, PermissionError, IOError, OSError) as e:
            logger.error(f"Ошибка при чтении JSON файла {file_path}: {str(e)}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Ошибка парсинга JSON в файле {file_path}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Неожиданная ошибка при чтении JSON файла {file_path}: {str(e)}")
            raise

    async def read_json(self, file_path: str) -> Optional[dict]:
        """
        Безопасное чтение JSON файла с возможностью использования MCP-сервера.

        Args:
            file_path: Путь к JSON файлу

        Returns:
            Содержимое JSON файла в виде словаря или None в случае неудачи
        """
        if self.use_mcp:
            try:
                server = await get_server()
                
                # Подготовка параметров для MCP-запроса
                params = {"path": file_path}
                
                # Вызов MCP-метода
                response = await server.handle_request({
                    "method": "read_json_file",
                    "params": params,
                    "id": 1
                })
                
                if response.get("result", {}).get("success"):
                    return response["result"]["data"]
                else:
                    error = response.get("result", {}).get("error", {})
                    logger.error(f"MCP read_json_file error: {error}")
                    # В случае ошибки MCP, fallback на локальное чтение
                    return self._local_read_json(file_path)
                    
            except Exception as e:
                logger.warning(f"MCP read_json_file failed, falling back to local: {str(e)}")
                # В случае ошибки при обращении к MCP, fallback на локальное чтение
                return self._local_read_json(file_path)
        else:
            # Использовать только локальные операции
            return self._local_read_json(file_path)

    @staticmethod
    def _local_read_lines(file_path: str, encoding: str = 'utf-8') -> Optional[List[str]]:
        """Локальное построчное чтение файла"""
        logger.info(f"Начинается локальное построчное чтение файла: {file_path}")
        
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                lines = f.readlines()
                logger.info(f"Файл успешно прочитан построчно: {file_path}")
                return [line.rstrip('\n\r') for line in lines]
        except (FileNotFoundError, PermissionError, IOError, OSError) as e:
            logger.error(f"Ошибка при построчном чтении файла {file_path}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Неожиданная ошибка при построчном чтении файла {file_path}: {str(e)}")
            raise

    async def read_lines(self, file_path: str, encoding: str = 'utf-8') -> Optional[List[str]]:
        """
        Чтение файла построчно с возможностью использования MCP-сервера.

        Args:
            file_path: Путь к файлу
            encoding: Кодировка файла (по умолчанию utf-8)

        Returns:
            Список строк из файла или None в случае неудачи
        """
        if self.use_mcp:
            try:
                server = await get_server()
                
                # Подготовка параметров для MCP-запроса
                params = {"path": file_path, "encoding": encoding}
                
                # Вызов MCP-метода
                response = await server.handle_request({
                    "method": "read_file_lines",
                    "params": params,
                    "id": 1
                })
                
                if response.get("result", {}).get("success"):
                    return response["result"]["lines"]
                else:
                    error = response.get("result", {}).get("error", {})
                    logger.error(f"MCP read_file_lines error: {error}")
                    # В случае ошибки MCP, fallback на локальное чтение
                    return self._local_read_lines(file_path, encoding)
                    
            except Exception as e:
                logger.warning(f"MCP read_file_lines failed, falling back to local: {str(e)}")
                # В случае ошибки при обращении к MCP, fallback на локальное чтение
                return self._local_read_lines(file_path, encoding)
        else:
            # Использовать только локальные операции
            return self._local_read_lines(file_path, encoding)

    @staticmethod
    def _local_file_exists(file_path: str) -> bool:
        """Локальная проверка существования файла"""
        logger.info(f"Проверка существования файла: {file_path}")
        
        try:
            exists = os.path.exists(file_path)
            logger.info(f"Проверка существования файла завершена: {file_path}, существует: {exists}")
            return exists
        except (PermissionError, OSError) as e:
            logger.error(f"Ошибка при проверке существования файла {file_path}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Неожиданная ошибка при проверке существования файла {file_path}: {str(e)}")
            raise

    async def file_exists(self, file_path: str) -> bool:
        """
        Проверка существования файла с возможностью использования MCP-сервера.

        Args:
            file_path: Путь к файлу

        Returns:
            True если файл существует, False в противном случае
        """
        if self.use_mcp:
            try:
                server = await get_server()
                
                # Подготовка параметров для MCP-запроса
                params = {"path": file_path}
                
                # Вызов MCP-метода
                response = await server.handle_request({
                    "method": "file_exists",
                    "params": params,
                    "id": 1
                })
                
                if response.get("result", {}).get("success"):
                    return response["result"]["exists"]
                else:
                    error = response.get("result", {}).get("error", {})
                    logger.error(f"MCP file_exists error: {error}")
                    # В случае ошибки MCP, fallback на локальную проверку
                    return self._local_file_exists(file_path)
                    
            except Exception as e:
                logger.warning(f"MCP file_exists failed, falling back to local: {str(e)}")
                # В случае ошибки при обращении к MCP, fallback на локальную проверку
                return self._local_file_exists(file_path)
        else:
            # Использовать только локальные операции
            return self._local_file_exists(file_path)

    @staticmethod
    def _local_get_file_size(file_path: str) -> Optional[int]:
        """Локальное получение размера файла"""
        logger.info(f"Получение размера файла: {file_path}")
        
        try:
            size = os.path.getsize(file_path)
            logger.info(f"Размер файла получен: {file_path}, размер: {size} байт")
            return size
        except (FileNotFoundError, PermissionError, OSError) as e:
            logger.error(f"Ошибка при получении размера файла {file_path}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Неожиданная ошибка при получении размера файла {file_path}: {str(e)}")
            raise

    async def get_file_size(self, file_path: str) -> Optional[int]:
        """
        Получение размера файла с возможностью использования MCP-сервера.

        Args:
            file_path: Путь к файлу

        Returns:
            Размер файла в байтах или None в случае неудачи
        """
        if self.use_mcp:
            try:
                server = await get_server()
                
                # Подготовка параметров для MCP-запроса
                params = {"path": file_path}
                
                # Вызов MCP-метода
                response = await server.handle_request({
                    "method": "get_file_size",
                    "params": params,
                    "id": 1
                })
                
                if response.get("result", {}).get("success"):
                    return response["result"]["size"]
                else:
                    error = response.get("result", {}).get("error", {})
                    logger.error(f"MCP get_file_size error: {error}")
                    # В случае ошибки MCP, fallback на локальное получение размера
                    return self._local_get_file_size(file_path)
                    
            except Exception as e:
                logger.warning(f"MCP get_file_size failed, falling back to local: {str(e)}")
                # В случае ошибки при обращении к MCP, fallback на локальное получение размера
                return self._local_get_file_size(file_path)
        else:
            # Использовать только локальные операции
            return self._local_get_file_size(file_path)


async def batch_read_files(file_paths: List[str]) -> Dict[str, Any]:
    """
    Массовое чтение файлов с возможностью использования MCP-сервера.

    Args:
        file_paths: Список путей к файлам для чтения

    Returns:
        Словарь в формате {file_path: content_or_None}, где content_or_None -
        содержимое файла или None в случае ошибки
    """
    logger.info(f"Начинается массовое чтение файлов: {len(file_paths)} файлов")
    
    results = {}
    
    # Попробуем использовать MCP для пакетного чтения
    try:
        # Проверим, доступен ли MCP-сервер
        from mcp_server.mcp_server import get_server
        server = await get_server()
        
        # Подготовим параметры для пакетного запроса
        params = {
            "files": [{"path": path, "encoding": "utf-8"} for path in file_paths]
        }
        
        # Вызовем пакетный метод MCP
        response = await server.handle_request({
            "method": "batch_read_files",
            "params": params,
            "id": 1
        })
        
        if response.get("result", {}).get("success"):
            # Обработка результатов пакетного запроса
            batch_results = response["result"]["results"]
            for result in batch_results:
                file_path = result["path"]
                if result["success"]:
                    results[file_path] = result.get("content")
                    logger.info(f"Файл успешно прочитан через MCP: {file_path}")
                else:
                    error = result.get("error", {})
                    logger.error(f"Ошибка при чтении файла через MCP {file_path}: {error}")
                    # Для неудачных файлов, попробуем локальное чтение
                    try:
                        reader = SafeFileReader(use_mcp=False)
                        content = await reader.read_file(file_path)
                        results[file_path] = content
                        logger.info(f"Файл успешно прочитан локально после MCP сбоя: {file_path}")
                    except Exception as e:
                        logger.error(f"Ошибка при локальном чтении файла {file_path}: {str(e)}")
                        results[file_path] = None
        else:
            logger.warning("MCP batch_read_files failed, falling back to individual reads")
            # Fallback: поочередное чтение файлов
            for file_path in file_paths:
                try:
                    reader = SafeFileReader(use_mcp=True)
                    content = await reader.read_file(file_path)
                    results[file_path] = content
                    
                    if content is not None:
                        logger.info(f"Файл успешно прочитан: {file_path}")
                    else:
                        logger.warning(f"Чтение файла вернуло None: {file_path}")
                        
                except Exception as e:
                    logger.error(f"Ошибка при чтении файла {file_path}: {str(e)}")
                    results[file_path] = None
    except ImportError:
        logger.info("MCP server not available, using local file operations")
        # MCP недоступен, используем локальные операции
        for file_path in file_paths:
            try:
                reader = SafeFileReader(use_mcp=False)
                content = await reader.read_file(file_path)
                results[file_path] = content
                
                if content is not None:
                    logger.info(f"Файл успешно прочитан: {file_path}")
                else:
                    logger.warning(f"Чтение файла вернуло None: {file_path}")
                    
            except Exception as e:
                logger.error(f"Ошибка при чтении файла {file_path}: {str(e)}")
                results[file_path] = None
    except Exception as e:
        logger.error(f"Неожиданная ошибка при массовом чтении файлов: {str(e)}")
        # В случае ошибки, используем локальные операции
        for file_path in file_paths:
            try:
                reader = SafeFileReader(use_mcp=False)
                content = await reader.read_file(file_path)
                results[file_path] = content
                
                if content is not None:
                    logger.info(f"Файл успешно прочитан: {file_path}")
                else:
                    logger.warning(f"Чтение файла вернуло None: {file_path}")
                    
            except Exception as e:
                logger.error(f"Ошибка при чтении файла {file_path}: {str(e)}")
                results[file_path] = None
    
    logger.info(f"Массовое чтение файлов завершено: {len([v for v in results.values() if v is not None])} успешных, {len([v for v in results.values() if v is None])} неудачных")
    
    return results