"""
Улучшенная система задач и фоновых процессов для приложения.
"""

import asyncio
import threading
import time
from typing import Callable, Any, Dict, Optional, List
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import logging
from .logging import get_logger


logger = get_logger(__name__)


@dataclass
class TaskResult:
    """Результат выполнения задачи."""
    success: bool
    result: Any = None
    error: Optional[Exception] = None
    started_at: datetime = None
    finished_at: datetime = None
    duration: float = 0.0


class TaskManager:
    """
    Менеджер задач для управления синхронными и асинхронными задачами.
    """
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.running_tasks = {}
    
    def run_sync(self, func: Callable, *args, **kwargs) -> TaskResult:
        """
        Выполнить синхронную задачу.
        
        Args:
            func: Функция для выполнения
            *args: Аргументы функции
            **kwargs: Ключевые аргументы функции
            
        Returns:
            TaskResult с результатом выполнения
        """
        started_at = datetime.utcnow()
        
        try:
            result = func(*args, **kwargs)
            finished_at = datetime.utcnow()
            duration = (finished_at - started_at).total_seconds()
            
            task_result = TaskResult(
                success=True,
                result=result,
                started_at=started_at,
                finished_at=finished_at,
                duration=duration
            )
            
            logger.info(
                'task_completed',
                task_name=func.__name__,
                duration=duration
            )
            
            return task_result
        except Exception as e:
            finished_at = datetime.utcnow()
            duration = (finished_at - started_at).total_seconds()
            
            task_result = TaskResult(
                success=False,
                error=e,
                started_at=started_at,
                finished_at=finished_at,
                duration=duration
            )
            
            logger.error(
                'task_failed',
                task_name=func.__name__,
                error=str(e),
                duration=duration
            )
            
            return task_result
    
    def run_async(self, coro) -> TaskResult:
        """
        Выполнить асинхронную задачу.
        
        Args:
            coro: Асинхронная корутина для выполнения
            
        Returns:
            TaskResult с результатом выполнения
        """
        started_at = datetime.utcnow()
        
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(coro)
            loop.close()
            
            finished_at = datetime.utcnow()
            duration = (finished_at - started_at).total_seconds()
            
            task_result = TaskResult(
                success=True,
                result=result,
                started_at=started_at,
                finished_at=finished_at,
                duration=duration
            )
            
            logger.info(
                'async_task_completed',
                duration=duration
            )
            
            return task_result
        except Exception as e:
            finished_at = datetime.utcnow()
            duration = (finished_at - started_at).total_seconds()
            
            task_result = TaskResult(
                success=False,
                error=e,
                started_at=started_at,
                finished_at=finished_at,
                duration=duration
            )
            
            logger.error(
                'async_task_failed',
                error=str(e),
                duration=duration
            )
            
            return task_result
    
    def run_parallel(self, tasks: List[tuple]) -> List[TaskResult]:
        """
        Выполнить несколько задач параллельно.
        
        Args:
            tasks: Список кортежей (функция, args, kwargs) для выполнения
            
        Returns:
            Список TaskResult с результатами выполнения
        """
        futures = []
        started_at = datetime.utcnow()
        
        for func, args, kwargs in tasks:
            future = self.executor.submit(self.run_sync, func, *args, **kwargs)
            futures.append(future)
        
        results = []
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
        
        finished_at = datetime.utcnow()
        duration = (finished_at - started_at).total_seconds()
        
        logger.info(
            'parallel_tasks_completed',
            task_count=len(tasks),
            duration=duration
        )
        
        return results
    
    def schedule(self, func: Callable, delay: int, *args, **kwargs) -> threading.Timer:
        """
        Запланировать выполнение задачи с задержкой.
        
        Args:
            func: Функция для выполнения
            delay: Задержка в секундах
            *args: Аргументы функции
            **kwargs: Ключевые аргументы функции
            
        Returns:
            Timer объект для управления задачей
        """
        def wrapper():
            self.run_sync(func, *args, **kwargs)
        
        timer = threading.Timer(delay, wrapper)
        timer.start()
        
        logger.info(
            'task_scheduled',
            task_name=func.__name__,
            delay=delay
        )
        
        return timer
    
    def close(self):
        """Закрыть менеджер задач и освободить ресурсы."""
        self.executor.shutdown(wait=True)


class BackgroundJob:
    """
    Класс для определения фоновых задач.
    """
    
    def __init__(self, name: str, func: Callable, schedule_interval: Optional[timedelta] = None):
        self.name = name
        self.func = func
        self.schedule_interval = schedule_interval
        self.last_run = None
        self.is_running = False
    
    def run(self) -> TaskResult:
        """Выполнить задачу."""
        if self.is_running:
            logger.warning(
                'job_already_running',
                job_name=self.name
            )
            return TaskResult(
                success=False,
                error=RuntimeError(f"Job '{self.name}' is already running")
            )
        
        self.is_running = True
        logger.info(
            'job_starting',
            job_name=self.name
        )
        
        try:
            task_manager = TaskManager()
            result = task_manager.run_sync(self.func)
            self.last_run = datetime.utcnow()
            
            logger.info(
                'job_completed',
                job_name=self.name,
                duration=result.duration
            )
            
            return result
        finally:
            self.is_running = False


class JobScheduler:
    """
    Планировщик фоновых задач.
    """
    
    def __init__(self):
        self.jobs: Dict[str, BackgroundJob] = {}
        self.task_manager = TaskManager()
        self.is_running = False
    
    def add_job(self, job: BackgroundJob):
        """Добавить задачу в планировщик."""
        self.jobs[job.name] = job
        logger.info(
            'job_added',
            job_name=job.name
        )
    
    def remove_job(self, job_name: str):
        """Удалить задачу из планировщика."""
        if job_name in self.jobs:
            del self.jobs[job_name]
            logger.info(
                'job_removed',
                job_name=job_name
            )
    
    def run_job(self, job_name: str) -> TaskResult:
        """Выполнить указанную задачу."""
        if job_name not in self.jobs:
            error = f"Job '{job_name}' not found"
            logger.error(
                'job_not_found',
                job_name=job_name
            )
            return TaskResult(success=False, error=RuntimeError(error))
        
        job = self.jobs[job_name]
        return job.run()
    
    def run_all_jobs(self) -> Dict[str, TaskResult]:
        """Выполнить все задачи."""
        results = {}
        for job_name in self.jobs:
            results[job_name] = self.run_job(job_name)
        return results
    
    def start_scheduler(self):
        """Запустить планировщик задач."""
        if self.is_running:
            return
        
        self.is_running = True
        logger.info('scheduler_started')
        
        def scheduler_loop():
            while self.is_running:
                current_time = datetime.utcnow()
                
                for job in self.jobs.values():
                    if job.schedule_interval and job.last_run:
                        next_run = job.last_run + job.schedule_interval
                        if current_time >= next_run and not job.is_running:
                            # Выполняем задачу в отдельном потоке
                            self.task_manager.run_sync(job.run)
                    elif job.schedule_interval and not job.last_run:
                        # Первоначальный запуск задачи с интервалом
                        self.task_manager.run_sync(job.run)
                
                time.sleep(1)  # Проверяем каждую секунду
        
        scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
        scheduler_thread.start()
    
    def stop_scheduler(self):
        """Остановить планировщик задач."""
        self.is_running = False
        logger.info('scheduler_stopped')
        
        # Закрываем менеджер задач
        self.task_manager.close()


# Глобальный экземпляр планировщика задач
job_scheduler = JobScheduler()


# Примеры часто используемых задач
def cleanup_expired_orders():
    """Фоновая задача для очистки просроченных заказов."""
    from api.models import Order
    from django.utils import timezone
    
    expired_threshold = timezone.now() - timedelta(hours=24)
    expired_orders = Order.objects.filter(
        status='WAITING_FOR_PAYMENT',
        created_at__lt=expired_threshold
    )
    
    count = expired_orders.count()
    expired_orders.delete()
    
    logger.info(
        'expired_orders_cleaned',
        count=count
    )
    
    return f"Cleaned {count} expired orders"


def update_producer_ratings():
    """Фоновая задача для обновления рейтингов производителей."""
    from api.models import Producer, Review
    
    producers = Producer.objects.all()
    updated_count = 0
    
    for producer in producers:
        ratings = Review.objects.filter(producer=producer).aggregate(
            avg_taste=Avg('rating_taste'),
            avg_appearance=Avg('rating_appearance'),
            avg_service=Avg('rating_service')
        )
        
        taste = ratings['avg_taste'] or 0
        appearance = ratings['avg_appearance'] or 0
        service = ratings['avg_service'] or 0
        
        new_rating = round((taste + appearance + service) / 3, 2)
        producer.rating = new_rating
        producer.rating_count = Review.objects.filter(producer=producer).count()
        producer.save(update_fields=['rating', 'rating_count'])
        updated_count += 1
    
    logger.info(
        'producer_ratings_updated',
        count=updated_count
    )
    
    return f"Updated ratings for {updated_count} producers"


def send_daily_reports():
    """Фоновая задача для отправки ежедневных отчетов."""
    from api.models import Order
    from django.utils import timezone
    
    today = timezone.now().date()
    daily_orders = Order.objects.filter(
        created_at__date=today
    ).count()
    
    daily_revenue = Order.objects.filter(
        created_at__date=today,
        status='COMPLETED'
    ).aggregate(total=Sum('total_price'))['total'] or 0
    
    report_data = {
        'date': today.isoformat(),
        'daily_orders': daily_orders,
        'daily_revenue': float(daily_revenue),
    }
    
    logger.info(
        'daily_report_generated',
        report_data=report_data
    )
    
    return f"Daily report generated: {daily_orders} orders, {daily_revenue} revenue"