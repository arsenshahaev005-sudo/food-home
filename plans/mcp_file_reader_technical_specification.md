# Техническая спецификация MCP-сервера для обработки ошибок чтения файлов

## 1. Структура файлов и директорий

### 1.1. Общая структура проекта

```
mcp_file_reader_server/
├── README.md
├── requirements.txt
├── setup.py
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── pytest.ini
├── mypy.ini
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── config/
│   ├── __init__.py
│   ├── server_config.yaml
│   ├── retry_config.yaml
│   ├── logging_config.yaml
│   └── production_config.yaml
├── mcp_server/
│   ├── __init__.py
│   ├── main.py
│   ├── server.py
│   ├── router.py
│   ├── handlers/
│   │   ├── __init__.py
│   │   ├── file_reader_handler.py
│   │   └── health_check_handler.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── retry_manager.py
│   │   ├── exception_classifier.py
│   │   ├── file_reader_wrapper.py
│   │   ├── backoff_strategy.py
│   │   ├── config_manager.py
│   │   ├── health_check.py
│   │   └── metrics_collector.py
│   ├── exceptions/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── file_exceptions.py
│   ├── logging/
│   │   ├── __init__.py
│   │   ├── structured_logger.py
│   │   └── logger_factory.py
│   ├── security/
│   │   ├── __init__.py
│   │   ├── path_validator.py
│   │   └── rate_limiter.py
│   └── utils/
│       ├── __init__.py
│       ├── async_utils.py
│       └── validation.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_retry_manager.py
│   │   ├── test_exception_classifier.py
│   │   ├── test_file_reader_wrapper.py
│   │   ├── test_backoff_strategy.py
│   │   ├── test_config_manager.py
│   │   └── test_health_check.py
│   ├── integration/
│   │   ├── __init__.py
│   │   ├── test_mcp_server.py
│   │   ├── test_handlers.py
│   │   └── test_integration.py
│   └── fixtures/
│       ├── __init__.py
│       ├── test_files/
│       │   ├── valid.txt
│       │   ├── valid.json
│       │   ├── large_file.txt
│       │   └── invalid.json
│       └── test_configs/
│           ├── minimal_config.yaml
│           └── full_config.yaml
├── docs/
│   ├── README.md
│   ├── api.md
│   ├── configuration.md
│   ├── deployment.md
│   └── troubleshooting.md
└── scripts/
    ├── start_server.sh
    ├── run_tests.sh
    └── build_docker.sh
```

### 1.2. Интеграция с существующим проектом

MCP-сервер будет размещен в отдельной директории `mcp_file_reader_server/` в корне проекта для независимой разработки и развертывания, но будет интегрирован с существующей Django-системой через:

1. **Расширение исключений** в `backend/core/exceptions.py`
2. **Расширение логирования** в `backend/core/logging.py`
3. **Обновление обработчика исключений** в `backend/core/exceptions_handler.py`

---

## 2. Конфигурационный файл

### 2.1. Основной конфигурационный файл (`config/server_config.yaml`)

```yaml
# MCP File Reader Server Configuration
# Version: 1.0.0

# Server Configuration
server:
  name: "mcp_file_reader_server"
  version: "1.0.0"
  description: "MCP Server for resilient file reading operations"
  
  # Network Configuration
  host: "0.0.0.0"
  port: 8080
  workers: 4
  
  # MCP Protocol Configuration
  mcp:
    protocol_version: "2024-11-05"
    capabilities:
      tools:
        - name: "read_file"
          description: "Read file content with retry mechanism"
          parameters:
            file_path: { type: "string", required: true }
            encoding: { type: "string", default: "utf-8" }
            retry_config: { type: "object", optional: true }
        
        - name: "read_file_lines"
          description: "Read file lines with retry mechanism"
          parameters:
            file_path: { type: "string", required: true }
            encoding: { type: "string", default: "utf-8" }
            retry_config: { type: "object", optional: true }
        
        - name: "read_json_file"
          description: "Read JSON file with retry mechanism"
          parameters:
            file_path: { type: "string", required: true }
            retry_config: { type: "object", optional: true }
        
        - name: "batch_read_files"
          description: "Read multiple files with retry mechanism"
          parameters:
            file_paths: { type: "array", required: true }
            retry_config: { type: "object", optional: true }
        
        - name: "file_exists"
          description: "Check if file exists with retry mechanism"
          parameters:
            file_path: { type: "string", required: true }
            retry_config: { type: "object", optional: true }
        
        - name: "get_file_size"
          description: "Get file size with retry mechanism"
          parameters:
            file_path: { type: "string", required: true }
            retry_config: { type: "object", optional: true }
      
      resources:
        - name: "file_system"
          description: "Access to file system operations"
          uri_template: "file://{path}"

# Retry Configuration
retry:
  # Default retry configuration for all operations
  default:
    max_attempts: 3
    base_delay: 1.0  # seconds
    max_delay: 60.0  # seconds
    exponential_base: 2.0
    jitter: true
    jitter_factor: 0.1
    
  # Operation-specific retry configurations
  operations:
    read_file:
      max_attempts: 5
      base_delay: 0.5
      max_delay: 30.0
      exponential_base: 2.0
      jitter: true
      jitter_factor: 0.1
    
    read_file_lines:
      max_attempts: 5
      base_delay: 0.5
      max_delay: 30.0
      exponential_base: 2.0
      jitter: true
      jitter_factor: 0.1
    
    read_json_file:
      max_attempts: 3
      base_delay: 1.0
      max_delay: 60.0
      exponential_base: 2.0
      jitter: true
      jitter_factor: 0.1
    
    batch_read_files:
      max_attempts: 2
      base_delay: 1.0
      max_delay: 60.0
      exponential_base: 2.0
      jitter: true
      jitter_factor: 0.1
    
    file_exists:
      max_attempts: 3
      base_delay: 0.5
      max_delay: 30.0
      exponential_base: 2.0
      jitter: true
      jitter_factor: 0.1
    
    get_file_size:
      max_attempts: 3
      base_delay: 0.5
      max_delay: 30.0
      exponential_base: 2.0
      jitter: true
      jitter_factor: 0.1

# Exception Classification
exceptions:
  # Retryable exceptions (temporary errors)
  retryable:
    - "BlockingIOError"
    - "TimeoutError"
    - "ConnectionError"
    - "TemporaryFailure"
  
  # Non-retryable exceptions (permanent errors)
  non_retryable:
    - "FileNotFoundError"
    - "PermissionError"
    - "IsADirectoryError"
    - "NotADirectoryError"
    - "UnicodeDecodeError"
    - "json.JSONDecodeError"
  
  # Custom exception mappings
  custom_mappings:
    "FileNotFoundError": "FileNotFoundReadException"
    "PermissionError": "FilePermissionException"
    "BlockingIOError": "FileLockedException"
    "IOError": "FileIOReadException"
    "OSError": "FileIOReadException"
    "json.JSONDecodeError": "FileParseReadException"
    "UnicodeDecodeError": "FileEncodingReadException"

# Logging Configuration
logging:
  level: "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
  format: "json"  # json, text
  
  # Log outputs
  handlers:
    console:
      enabled: true
      level: "INFO"
      format: "json"
    
    file:
      enabled: true
      level: "DEBUG"
      path: "/var/log/mcp_file_reader/server.log"
      max_size: "100MB"
      backup_count: 5
      format: "json"
  
  # Structured logging configuration
  structured:
    include_trace_id: true
    include_user_id: true
    include_request_id: true
    include_timestamp: true
    include_level: true
    include_logger: true
    
  # Event types for filtering
  event_types:
    file_operations:
      - "file_read_attempt"
      - "file_read_success"
      - "file_read_retry"
      - "file_read_failure"
      - "file_read_degraded"
    
    mcp_operations:
      - "mcp_request_received"
      - "mcp_request_processed"
      - "mcp_request_error"
    
    system_operations:
      - "server_started"
      - "server_stopped"
      - "health_check_passed"
      - "health_check_failed"
      - "config_loaded"
      - "config_error"

# Security Configuration
security:
  # Path validation
  path_validation:
    enabled: true
    allowed_base_dirs:
      - "/var/www/uploads"
      - "/home/user/documents"
      - "/tmp/mcp_allowed"
      - "./data"
    
    # Blocked patterns
    blocked_patterns:
      - "\\.\\./"  # Path traversal
      - "^/etc/"   # System directories
      - "^/var/log/"  # Log directories
      - "^/proc/"  # Process directories
      - "^/sys/"   # System directories
    
    # Maximum file size (bytes)
    max_file_size: 10485760  # 10MB
    
    # Allowed file extensions
    allowed_extensions:
      - ".txt"
      - ".json"
      - ".csv"
      - ".xml"
      - ".yaml"
      - ".yml"
      - ".log"
      - ".md"
      - ".py"
      - ".js"
      - ".html"
      - ".css"
  
  # Rate limiting
  rate_limiting:
    enabled: true
    # Requests per window
    max_requests_per_window: 100
    # Window duration in seconds
    window_duration: 60
    # Cleanup interval in seconds
    cleanup_interval: 300
    
    # Per-client limits
    per_client_limits:
      default:
        max_requests: 100
        window: 60
      
      authenticated:
        max_requests: 1000
        window: 60
      
      premium:
        max_requests: 5000
        window: 60

# Health Check Configuration
health_check:
  enabled: true
  interval: 60  # seconds
  timeout: 10   # seconds
  
  # Components to check
  components:
    filesystem:
      enabled: true
      test_file_path: "/tmp/mcp_health_check.txt"
      timeout: 5
    
    configuration:
      enabled: true
      timeout: 2
    
    logging:
      enabled: true
      timeout: 2
    
    disk_space:
      enabled: true
      threshold: 90  # percentage
      path: "/"
    
    memory:
      enabled: true
      threshold: 90  # percentage

# Metrics Configuration
metrics:
  enabled: true
  
  # Metrics to collect
  collection:
    performance_metrics:
      enabled: true
      interval: 30  # seconds
      
      metrics:
        - "response_time"
        - "throughput"
        - "concurrent_requests"
    
    reliability_metrics:
      enabled: true
      interval: 60  # seconds
      
      metrics:
        - "success_rate"
        - "error_rate"
        - "retry_rate"
        - "degraded_rate"
    
    resource_metrics:
      enabled: true
      interval: 60  # seconds
      
      metrics:
        - "memory_usage"
        - "cpu_usage"
        - "disk_usage"
        - "network_io"
    
    operation_metrics:
      enabled: true
      interval: 30  # seconds
      
      operations:
        - "read_file"
        - "read_file_lines"
        - "read_json_file"
        - "batch_read_files"
        - "file_exists"
        - "get_file_size"
  
  # Export configuration
  export:
    prometheus:
      enabled: false
      port: 9090
      path: "/metrics"
    
    statsd:
      enabled: false
      host: "localhost"
      port: 8125
      prefix: "mcp_file_reader"
    
    json_file:
      enabled: true
      path: "/var/log/mcp_file_reader/metrics.json"
      interval: 60  # seconds

# Graceful Degradation Configuration
degradation:
  enabled: true
  
  # Cache configuration
  cache:
    enabled: true
    ttl: 300  # seconds (5 minutes)
    max_size: 1000  # maximum number of cached files
    cleanup_interval: 600  # seconds (10 minutes)
  
  # Fallback values
  fallback_values:
    file_exists: false
    file_size: 0
    file_content: null
    file_lines: []
  
  # Degradation levels
  levels:
    level_1:
      name: "retry_degradation"
      description: "Increase retry attempts and delays"
      trigger_conditions:
        error_rate: 0.05  # 5%
        consecutive_failures: 3
      actions:
        retry:
          max_attempts_multiplier: 2.0
          base_delay_multiplier: 1.5
    
    level_2:
      name: "cache_degradation"
      description: "Use cached values when available"
      trigger_conditions:
        error_rate: 0.10  # 10%
        consecutive_failures: 5
      actions:
        cache:
          enabled: true
          ttl_multiplier: 2.0
    
    level_3:
      name: "fallback_degradation"
      description: "Use fallback values"
      trigger_conditions:
        error_rate: 0.20  # 20%
        consecutive_failures: 10
      actions:
        fallback:
          enabled: true
    
    level_4:
      name: "partial_degradation"
      description: "Disable non-critical operations"
      trigger_conditions:
        error_rate: 0.30  # 30%
        consecutive_failures: 15
      actions:
        operations:
          disabled:
            - "batch_read_files"
            - "read_file_lines"
    
    level_5:
      name: "full_degradation"
      description: "Minimal functionality only"
      trigger_conditions:
        error_rate: 0.50  # 50%
        consecutive_failures: 20
      actions:
        operations:
          enabled:
            - "file_exists"
            - "get_file_size"

# Development Configuration
development:
  debug: false
  auto_reload: false
  
  # Testing configuration
  testing:
    mock_filesystem: false
    test_data_path: "./tests/fixtures/test_files"
    
  # Profiling
  profiling:
    enabled: false
    output_path: "./profiles"
    
  # Debug endpoints
  debug_endpoints:
    enabled: false
    paths:
      - "/debug/config"
      - "/debug/metrics"
      - "/debug/health"
      - "/debug/cache"

# Production Configuration
production:
  # Worker configuration
  workers: 4
  
  # Connection limits
  max_connections: 1000
  connection_timeout: 30  # seconds
  
  # Request limits
  max_request_size: 10485760  # 10MB
  request_timeout: 60  # seconds
  
  # Resource limits
  max_memory_usage: 1073741824  # 1GB
  max_cpu_usage: 80  # percentage
  
  # Monitoring
  monitoring:
    enabled: true
    alert_webhook: "https://alerts.example.com/webhook"
    alert_thresholds:
      error_rate: 0.05  # 5%
      response_time_p95: 10  # seconds
      memory_usage: 80  # percentage
      cpu_usage: 80  # percentage
```

### 2.2. Файл переменных окружения (`.env.example`)

```bash
# Server Configuration
MCP_SERVER_NAME=mcp_file_reader_server
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_HOST=0.0.0.0
MCP_SERVER_PORT=8080
MCP_SERVER_WORKERS=4

# Configuration Paths
MCP_CONFIG_PATH=./config/server_config.yaml
MCP_RETRY_CONFIG_PATH=./config/retry_config.yaml
MCP_LOGGING_CONFIG_PATH=./config/logging_config.yaml

# Logging Configuration
MCP_LOG_LEVEL=INFO
MCP_LOG_FORMAT=json
MCP_LOG_FILE_PATH=/var/log/mcp_file_reader/server.log
MCP_LOG_MAX_SIZE=100MB
MCP_LOG_BACKUP_COUNT=5

# Security Configuration
MCP_PATH_VALIDATION_ENABLED=true
MCP_ALLOWED_BASE_DIRS=/var/www/uploads,/home/user/documents,/tmp/mcp_allowed
MCP_MAX_FILE_SIZE=10485760
MCP_RATE_LIMITING_ENABLED=true
MCP_MAX_REQUESTS_PER_WINDOW=100
MCP_WINDOW_DURATION=60

# Health Check Configuration
MCP_HEALTH_CHECK_ENABLED=true
MCP_HEALTH_CHECK_INTERVAL=60
MCP_HEALTH_CHECK_TIMEOUT=10

# Metrics Configuration
MCP_METRICS_ENABLED=true
MCP_METRICS_EXPORT_JSON_FILE_PATH=/var/log/mcp_file_reader/metrics.json
MCP_METRICS_EXPORT_INTERVAL=60

# Cache Configuration
MCP_CACHE_ENABLED=true
MCP_CACHE_TTL=300
MCP_CACHE_MAX_SIZE=1000
MCP_CACHE_CLEANUP_INTERVAL=600

# Development Configuration
MCP_DEBUG=false
MCP_AUTO_RELOAD=false
MCP_PROFILING_ENABLED=false
MCP_DEBUG_ENDPOINTS_ENABLED=false

# Production Configuration
MCP_MAX_CONNECTIONS=1000
MCP_CONNECTION_TIMEOUT=30
MCP_MAX_REQUEST_SIZE=10485760
MCP_REQUEST_TIMEOUT=60
MCP_MAX_MEMORY_USAGE=1073741824
MCP_MAX_CPU_USAGE=80

# Django Integration
DJANGO_SETTINGS_MODULE=backend.backend.settings
DJANGO_INTEGRATION_ENABLED=true

# Monitoring
MONITORING_ENABLED=true
MONITORING_ALERT_WEBHOOK=https://alerts.example.com/webhook
MONITORING_ERROR_RATE_THRESHOLD=0.05
MONITORING_RESPONSE_TIME_P95_THRESHOLD=10
MONITORING_MEMORY_USAGE_THRESHOLD=80
MONITORING_CPU_USAGE_THRESHOLD=80
```

---

## 3. API MCP-сервера

### 3.1. MCP Protocol Specification

MCP-сервер реализует протокол Model Context Protocol версии 2024-11-05.

#### 3.1.1. Server Information

```json
{
  "name": "mcp_file_reader_server",
  "version": "1.0.0",
  "description": "MCP Server for resilient file reading operations with retry mechanism",
  "protocol_version": "2024-11-05",
  "capabilities": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read file content with retry mechanism and exponential backoff",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": {
              "type": "string",
              "description": "Path to the file to read"
            },
            "encoding": {
              "type": "string",
              "description": "File encoding (default: utf-8)",
              "default": "utf-8"
            },
            "retry_config": {
              "type": "object",
              "description": "Optional retry configuration",
              "properties": {
                "max_attempts": {
                  "type": "integer",
                  "description": "Maximum number of retry attempts",
                  "minimum": 1,
                  "maximum": 10
                },
                "base_delay": {
                  "type": "number",
                  "description": "Base delay between retries in seconds",
                  "minimum": 0.1,
                  "maximum": 60.0
                },
                "max_delay": {
                  "type": "number",
                  "description": "Maximum delay between retries in seconds",
                  "minimum": 1.0,
                  "maximum": 300.0
                }
              }
            }
          },
          "required": ["file_path"]
        }
      },
      {
        "name": "read_file_lines",
        "description": "Read file lines with retry mechanism",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": {
              "type": "string",
              "description": "Path to the file to read"
            },
            "encoding": {
              "type": "string",
              "description": "File encoding (default: utf-8)",
              "default": "utf-8"
            },
            "retry_config": {
              "type": "object",
              "description": "Optional retry configuration"
            }
          },
          "required": ["file_path"]
        }
      },
      {
        "name": "read_json_file",
        "description": "Read JSON file with retry mechanism",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": {
              "type": "string",
              "description": "Path to the JSON file to read"
            },
            "retry_config": {
              "type": "object",
              "description": "Optional retry configuration"
            }
          },
          "required": ["file_path"]
        }
      },
      {
        "name": "batch_read_files",
        "description": "Read multiple files with retry mechanism",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_paths": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "List of file paths to read"
            },
            "retry_config": {
              "type": "object",
              "description": "Optional retry configuration"
            }
          },
          "required": ["file_paths"]
        }
      },
      {
        "name": "file_exists",
        "description": "Check if file exists with retry mechanism",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": {
              "type": "string",
              "description": "Path to the file to check"
            },
            "retry_config": {
              "type": "object",
              "description": "Optional retry configuration"
            }
          },
          "required": ["file_path"]
        }
      },
      {
        "name": "get_file_size",
        "description": "Get file size with retry mechanism",
        "input_schema": {
          "type": "object",
          "properties": {
            "file_path": {
              "type": "string",
              "description": "Path to the file"
            },
            "retry_config": {
              "type": "object",
              "description": "Optional retry configuration"
            }
          },
          "required": ["file_path"]
        }
      }
    ],
    "resources": [
      {
        "name": "file_system",
        "description": "Access to file system operations",
        "uri_template": "file://{path}"
      }
    ]
  }
}
```

#### 3.1.2. Response Format

Все MCP-ответы следуют единому формату:

```json
{
  "success": true,
  "result": {
    // Operation-specific result
  },
  "metadata": {
    "operation": "read_file",
    "attempts": 2,
    "total_time": 1.234,
    "trace_id": "abc123-def456-ghi789",
    "degraded": false,
    "cache_hit": false
  }
}
```

### 3.2. Tool Endpoints

#### 3.2.1. read_file

**Описание:** Чтение содержимого файла с механизмом повтора

**Параметры:**
- `file_path` (string, required): Путь к файлу
- `encoding` (string, optional): Кодировка файла (по умолчанию utf-8)
- `retry_config` (object, optional): Конфигурация retry механизма

**Пример запроса:**
```json
{
  "tool": "read_file",
  "arguments": {
    "file_path": "/path/to/file.txt",
    "encoding": "utf-8",
    "retry_config": {
      "max_attempts": 5,
      "base_delay": 0.5,
      "max_delay": 30.0
    }
  }
}
```

**Пример успешного ответа:**
```json
{
  "success": true,
  "result": {
    "content": "File content here...",
    "encoding": "utf-8",
    "size": 1024
  },
  "metadata": {
    "operation": "read_file",
    "attempts": 1,
    "total_time": 0.123,
    "trace_id": "abc123-def456-ghi789",
    "degraded": false,
    "cache_hit": false
  }
}
```

**Пример ответа с ошибкой:**
```json
{
  "success": false,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "File not found: /path/to/nonexistent.txt",
    "details": {
      "file_path": "/path/to/nonexistent.txt",
      "original_error": "FileNotFoundError"
    }
  },
  "metadata": {
    "operation": "read_file",
    "attempts": 3,
    "total_time": 5.678,
    "trace_id": "abc123-def456-ghi789",
    "degraded": false,
    "cache_hit": false
  }
}
```

#### 3.2.2. read_file_lines

**Описание:** Чтение файла построчно с механизмом повтора

**Параметры:**
- `file_path` (string, required): Путь к файлу
- `encoding` (string, optional): Кодировка файла (по умолчанию utf-8)
- `retry_config` (object, optional): Конфигурация retry механизма

**Пример успешного ответа:**
```json
{
  "success": true,
  "result": {
    "lines": [
      "Line 1 content",
      "Line 2 content",
      "Line 3 content"
    ],
    "count": 3,
    "encoding": "utf-8"
  },
  "metadata": {
    "operation": "read_file_lines",
    "attempts": 1,
    "total_time": 0.234,
    "trace_id": "def456-ghi789-jkl012",
    "degraded": false,
    "cache_hit": false
  }
}
```

#### 3.2.3. read_json_file

**Описание:** Чтение JSON файла с механизмом повтора

**Параметры:**
- `file_path` (string, required): Путь к JSON файлу
- `retry_config` (object, optional): Конфигурация retry механизма

**Пример успешного ответа:**
```json
{
  "success": true,
  "result": {
    "data": {
      "key1": "value1",
      "key2": "value2",
      "nested": {
        "key3": "value3"
      }
    },
    "encoding": "utf-8"
  },
  "metadata": {
    "operation": "read_json_file",
    "attempts": 2,
    "total_time": 1.456,
    "trace_id": "ghi789-jkl012-mno345",
    "degraded": false,
    "cache_hit": false
  }
}
```

#### 3.2.4. batch_read_files

**Описание:** Массовое чтение файлов с механизмом повтора

**Параметры:**
- `file_paths` (array, required): Список путей к файлам
- `retry_config` (object, optional): Конфигурация retry механизма

**Пример успешного ответа:**
```json
{
  "success": true,
  "result": {
    "results": {
      "/path/to/file1.txt": {
        "success": true,
        "content": "File 1 content",
        "size": 1024
      },
      "/path/to/file2.txt": {
        "success": true,
        "content": "File 2 content",
        "size": 2048
      },
      "/path/to/nonexistent.txt": {
        "success": false,
        "error": {
          "code": "FILE_NOT_FOUND",
          "message": "File not found"
        }
      }
    },
    "summary": {
      "total": 3,
      "successful": 2,
      "failed": 1
    }
  },
  "metadata": {
    "operation": "batch_read_files",
    "attempts": 1,
    "total_time": 2.345,
    "trace_id": "jkl012-mno345-pqr678",
    "degraded": false,
    "cache_hit": false
  }
}
```

#### 3.2.5. file_exists

**Описание:** Проверка существования файла с механизмом повтора

**Параметры:**
- `file_path` (string, required): Путь к файлу
- `retry_config` (object, optional): Конфигурация retry механизма

**Пример успешного ответа:**
```json
{
  "success": true,
  "result": {
    "exists": true,
    "file_path": "/path/to/existing.txt"
  },
  "metadata": {
    "operation": "file_exists",
    "attempts": 1,
    "total_time": 0.056,
    "trace_id": "mno345-pqr678-stu901",
    "degraded": false,
    "cache_hit": false
  }
}
```

#### 3.2.6. get_file_size

**Описание:** Получение размера файла с механизмом повтора

**Параметры:**
- `file_path` (string, required): Путь к файлу
- `retry_config` (object, optional): Конфигурация retry механизма

**Пример успешного ответа:**
```json
{
  "success": true,
  "result": {
    "size": 1024,
    "file_path": "/path/to/file.txt",
    "size_human": "1.0 KB"
  },
  "metadata": {
    "operation": "get_file_size",
    "attempts": 1,
    "total_time": 0.067,
    "trace_id": "pqr678-stu901-vwx234",
    "degraded": false,
    "cache_hit": false
  }
}
```

### 3.3. Resource Endpoints

#### 3.3.1. file_system

**URI Template:** `file://{path}`

**Описание:** Доступ к файловой системе через ресурсный интерфейс MCP

**Пример запроса:**
```json
{
  "resource": "file_system",
  "uri": "file:///path/to/file.txt"
}
```

**Пример ответа:**
```json
{
  "success": true,
  "result": {
    "content": "File content here...",
    "metadata": {
      "path": "/path/to/file.txt",
      "size": 1024,
      "encoding": "utf-8",
      "last_modified": "2026-01-20T15:53:15.495Z"
    }
  },
  "metadata": {
    "operation": "resource_access",
    "attempts": 1,
    "total_time": 0.123,
    "trace_id": "stu901-vwx234-yza567",
    "degraded": false,
    "cache_hit": false
  }
}
```

---

## 4. Зависимости

### 4.1. Requirements.txt

```txt
# Core dependencies
asyncio-mqtt>=0.13.0
pydantic>=2.0.0
pyyaml>=6.0
click>=8.0.0

# MCP Protocol
mcp>=1.0.0

# Async support
aiofiles>=23.0.0
aiohttp>=3.8.0

# Retry mechanism
tenacity>=8.0.0

# Security
cryptography>=41.0.0
pathvalidate>=3.0.0

# Monitoring and metrics
prometheus-client>=0.17.0
statsd>=4.0.0

# Logging
structlog>=23.0.0
colorama>=0.4.0

# Configuration
python-dotenv>=1.0.0

# Development dependencies
pytest>=7.0.0
pytest-asyncio>=0.21.0
pytest-cov>=4.0.0
pytest-mock>=3.10.0
black>=23.0.0
isort>=5.12.0
mypy>=1.5.0
flake8>=6.0.0
pre-commit>=3.3.0

# Django integration (optional)
django>=4.2.0
djangorestframework>=3.14.0

# Testing
factory-boy>=3.2.0
faker>=19.0.0
httpx>=0.24.0

# Performance profiling
py-spy>=0.3.14
memory-profiler>=0.61.0
```

### 4.2. Setup.py

```python
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="mcp-file-reader-server",
    version="1.0.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="MCP Server for resilient file reading operations with retry mechanism",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/mcp-file-reader-server",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Filesystems",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.0.0",
            "pytest-mock>=3.10.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "mypy>=1.5.0",
            "flake8>=6.0.0",
            "pre-commit>=3.3.0",
        ],
        "django": [
            "django>=4.2.0",
            "djangorestframework>=3.14.0",
        ],
        "monitoring": [
            "prometheus-client>=0.17.0",
            "statsd>=4.0.0",
        ],
        "profiling": [
            "py-spy>=0.3.14",
            "memory-profiler>=0.61.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "mcp-file-reader-server=mcp_server.main:main",
        ],
    },
    include_package_data=True,
    package_data={
        "mcp_server": ["config/*.yaml"],
    },
)
```

### 4.3. Pyproject.toml

```toml
[build-system]
requires = ["setuptools>=61.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "mcp-file-reader-server"
version = "1.0.0"
description = "MCP Server for resilient file reading operations with retry mechanism"
readme = "README.md"
license = {file = "LICENSE"}
authors = [
    {name = "Your Name", email = "your.email@example.com"},
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.8",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Topic :: Software Development :: Libraries :: Python Modules",
    "Topic :: System :: Filesystems",
]
requires-python = ">=3.8"
dependencies = [
    "asyncio-mqtt>=0.13.0",
    "pydantic>=2.0.0",
    "pyyaml>=6.0",
    "click>=8.0.0",
    "mcp>=1.0.0",
    "aiofiles>=23.0.0",
    "aiohttp>=3.8.0",
    "tenacity>=8.0.0",
    "cryptography>=41.0.0",
    "pathvalidate>=3.0.0",
    "structlog>=23.0.0",
    "colorama>=0.4.0",
    "python-dotenv>=1.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
    "pytest-mock>=3.10.0",
    "black>=23.0.0",
    "isort>=5.12.0",
    "mypy>=1.5.0",
    "flake8>=6.0.0",
    "pre-commit>=3.3.0",
]
django = [
    "django>=4.2.0",
    "djangorestframework>=3.14.0",
]
monitoring = [
    "prometheus-client>=0.17.0",
    "statsd>=4.0.0",
]
profiling = [
    "py-spy>=0.3.14",
    "memory-profiler>=0.61.0",
]

[project.scripts]
mcp-file-reader-server = "mcp_server.main:main"

[project.urls]
Homepage = "https://github.com/yourusername/mcp-file-reader-server"
Documentation = "https://mcp-file-reader-server.readthedocs.io/"
Repository = "https://github.com/yourusername/mcp-file-reader-server.git"
"Bug Tracker" = "https://github.com/yourusername/mcp-file-reader-server/issues"

[tool.setuptools.packages.find]
where = ["."]
include = ["mcp_server*"]

[tool.setuptools.package-data]
mcp_server = ["config/*.yaml"]

[tool.black]
line-length = 88
target-version = ['py38']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 88
known_first_party = ["mcp_server"]

[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true
strict_equality = true

[[tool.mypy.overrides]]
module = [
    "mcp.*",
    "aiofiles.*",
    "tenacity.*",
]
ignore_missing_imports = true

[tool.pytest.ini_options]
minversion = "7.0"
addopts = "-ra -q --strict-markers --strict-config"
testpaths = ["tests"]
asyncio_mode = "auto"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests as integration tests",
    "unit: marks tests as unit tests",
]

[tool.coverage.run]
source = ["mcp_server"]
omit = [
    "*/tests/*",
    "*/test_*",
    "setup.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if self.debug:",
    "if settings.DEBUG",
    "raise AssertionError",
    "raise NotImplementedError",
    "if 0:",
    "if __name__ == .__main__.:",
    "class .*\\bProtocol\\):",
    "@(abc\\.)?abstractmethod",
]
```

---

## 5. Инструкции по развертыванию

### 5.1. Локальная разработка

#### 5.1.1. Установка зависимостей

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/mcp-file-reader-server.git
cd mcp-file-reader-server

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows

# Установка зависимостей
pip install -e ".[dev,monitoring,profiling]"

# Установка pre-commit hooks
pre-commit install
```

#### 5.1.2. Конфигурация

```bash
# Копирование файла конфигурации
cp .env.example .env

# Редактирование конфигурации
nano .env

# Копирование конфигурационных файлов
cp config/server_config.yaml.example config/server_config.yaml
```

#### 5.1.3. Запуск

```bash
# Запуск сервера
mcp-file-reader-server

# Или через Python
python -m mcp_server.main

# С отладкой
mcp-file-reader-server --debug

# С кастомной конфигурацией
mcp-file-reader-server --config ./config/custom_config.yaml
```

### 5.2. Docker развертывание

#### 5.2.1. Dockerfile

```dockerfile
FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Создание рабочего пользователя
RUN useradd --create-home --shell /bin/bash mcp
USER mcp
WORKDIR /home/mcp

# Копирование зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование приложения
COPY . .

# Установка приложения
RUN pip install -e .

# Создание директорий для логов
RUN mkdir -p /home/mcp/logs /home/mcp/data

# Открываю порт
EXPOSE 8080

# Переменные окружения
ENV MCP_SERVER_HOST=0.0.0.0
ENV MCP_SERVER_PORT=8080
ENV MCP_LOG_FILE_PATH=/home/mcp/logs/server.log

# Запуск
CMD ["mcp-file-reader-server"]
```

#### 5.2.2. Docker Compose

```yaml
version: '3.8'

services:
  mcp-file-reader-server:
    build: .
    ports:
      - "8080:8080"
    environment:
      - MCP_SERVER_HOST=0.0.0.0
      - MCP_SERVER_PORT=8080
      - MCP_LOG_LEVEL=INFO
      - MCP_METRICS_ENABLED=true
    volumes:
      - ./config:/home/mcp/config:ro
      - ./logs:/home/mcp/logs
      - ./data:/home/mcp/data:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

#### 5.2.3. Запуск через Docker

```bash
# Сборка образа
docker build -t mcp-file-reader-server:latest .

# Запуск контейнера
docker run -d \
  --name mcp-file-reader-server \
  -p 8080:8080 \
  -v $(pwd)/config:/home/mcp/config:ro \
  -v $(pwd)/logs:/home/mcp/logs \
  -e MCP_SERVER_HOST=0.0.0.0 \
  -e MCP_SERVER_PORT=8080 \
  mcp-file-reader-server:latest

# Запуск через Docker Compose
docker-compose up -d

# Просмотр логов
docker-compose logs -f mcp-file-reader-server

# Остановка
docker-compose down
```

### 5.3. Production развертывание

#### 5.3.1. Systemd Service

```ini
# /etc/systemd/system/mcp-file-reader-server.service
[Unit]
Description=MCP File Reader Server
After=network.target

[Service]
Type=simple
User=mcp
Group=mcp
WorkingDirectory=/opt/mcp-file-reader-server
Environment=PATH=/opt/mcp-file-reader-server/venv/bin
ExecStart=/opt/mcp-file-reader-server/venv/bin/mcp-file-reader-server
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5

# Environment variables
Environment=MCP_SERVER_HOST=0.0.0.0
Environment=MCP_SERVER_PORT=8080
Environment=MCP_CONFIG_PATH=/opt/mcp-file-reader-server/config/server_config.yaml
Environment=MCP_LOG_LEVEL=INFO
Environment=MCP_METRICS_ENABLED=true

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/mcp-file-reader-server/logs /opt/mcp-file-reader-server/data

[Install]
WantedBy=multi-user.target
```

#### 5.3.2. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/mcp-file-reader-server
upstream mcp_file_reader_server {
    server 127.0.0.1:8080;
    keepalive 32;
}

server {
    listen 80;
    server_name mcp-file-reader.example.com;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=mcp_api:10m rate=10r/s;
    
    location / {
        limit_req zone=mcp_api burst=20 nodelay;
        
        proxy_pass http://mcp_file_reader_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://mcp_file_reader_server/health;
        access_log off;
    }
    
    # Metrics endpoint (restricted access)
    location /metrics {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://mcp_file_reader_server/metrics;
    }
    
    # Logging
    access_log /var/log/nginx/mcp-file-reader-server-access.log;
    error_log /var/log/nginx/mcp-file-reader-server-error.log;
}
```

#### 5.3.3. Развертывание скриптом

```bash
#!/bin/bash
# deploy.sh

set -e

# Конфигурация
APP_NAME="mcp-file-reader-server"
APP_USER="mcp"
APP_DIR="/opt/mcp-file-reader-server"
SERVICE_NAME="mcp-file-reader-server"

echo "Starting deployment of $APP_NAME..."

# Создание пользователя
if ! id "$APP_USER" &>/dev/null; then
    echo "Creating user $APP_USER..."
    sudo useradd --create-home --shell /bin/bash "$APP_USER"
fi

# Создание директорий
echo "Creating directories..."
sudo mkdir -p "$APP_DIR"/{config,data,logs}
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Копирование приложения
echo "Copying application files..."
sudo cp -r . "$APP_DIR/app"
sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR/app"

# Установка зависимостей
echo "Installing dependencies..."
cd "$APP_DIR/app"
sudo -u "$APP_USER" python -m venv venv
sudo -u "$APP_USER" venv/bin/pip install -e ".[monitoring]"

# Копирование конфигурации
echo "Copying configuration..."
sudo cp config/server_config.yaml "$APP_DIR/config/"
sudo chown "$APP_USER:$APP_USER" "$APP_DIR/config/server_config.yaml"

# Создание systemd service
echo "Creating systemd service..."
sudo cp deploy/mcp-file-reader-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

# Запуск сервиса
echo "Starting service..."
sudo systemctl start "$SERVICE_NAME"

# Проверка статуса
echo "Checking service status..."
sudo systemctl status "$SERVICE_NAME"

echo "Deployment completed successfully!"
echo "Service is available at: http://localhost:8080"
echo "Health check: http://localhost:8080/health"
```

### 5.4. Kubernetes развертывание

#### 5.4.1. Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-file-reader-server
  labels:
    app: mcp-file-reader-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mcp-file-reader-server
  template:
    metadata:
      labels:
        app: mcp-file-reader-server
    spec:
      containers:
      - name: mcp-file-reader-server
        image: mcp-file-reader-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: MCP_SERVER_HOST
          value: "0.0.0.0"
        - name: MCP_SERVER_PORT
          value: "8080"
        - name: MCP_LOG_LEVEL
          value: "INFO"
        - name: MCP_METRICS_ENABLED
          value: "true"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        volumeMounts:
        - name: config
          mountPath: /home/mcp/config
          readOnly: true
        - name: logs
          mountPath: /home/mcp/logs
      volumes:
      - name: config
        configMap:
          name: mcp-file-reader-config
      - name: logs
        emptyDir: {}
```

#### 5.4.2. Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-file-reader-server
  labels:
    app: mcp-file-reader-server
spec:
  selector:
    app: mcp-file-reader-server
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
```

#### 5.4.3. Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-file-reader-server
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  rules:
  - host: mcp-file-reader.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-file-reader-server
            port:
              number: 80
```

#### 5.4.4. ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-file-reader-config
data:
  server_config.yaml: |
    # Configuration content here
    server:
      name: "mcp_file_reader_server"
      version: "1.0.0"
      host: "0.0.0.0"
      port: 8080
    # ... rest of configuration
```

---

## 6. Примеры использования

### 6.1. Базовое использование MCP-клиента

```python
import asyncio
from mcp import Client

async def main():
    # Создание MCP-клиента
    client = Client("stdio")
    
    # Подключение к MCP-серверу
    await client.connect()
    
    try:
        # Чтение файла
        result = await client.call_tool("read_file", {
            "file_path": "/path/to/example.txt"
        })
        
        if result["success"]:
            print(f"File content: {result['result']['content']}")
            print(f"Attempts: {result['metadata']['attempts']}")
            print(f"Time: {result['metadata']['total_time']:.3f}s")
        else:
            print(f"Error: {result['error']['message']}")
        
        # Чтение JSON файла
        json_result = await client.call_tool("read_json_file", {
            "file_path": "/path/to/config.json"
        })
        
        if json_result["success"]:
            print(f"JSON data: {json_result['result']['data']}")
        
        # Массовое чтение файлов
        batch_result = await client.call_tool("batch_read_files", {
            "file_paths": [
                "/path/to/file1.txt",
                "/path/to/file2.txt",
                "/path/to/file3.txt"
            ]
        })
        
        if batch_result["success"]:
            summary = batch_result["result"]["summary"]
            print(f"Total: {summary['total']}")
            print(f"Successful: {summary['successful']}")
            print(f"Failed: {summary['failed']}")
        
        # Проверка существования файла
        exists_result = await client.call_tool("file_exists", {
            "file_path": "/path/to/check.txt"
        })
        
        if exists_result["success"]:
            exists = exists_result["result"]["exists"]
            print(f"File exists: {exists}")
        
        # Получение размера файла
        size_result = await client.call_tool("get_file_size", {
            "file_path": "/path/to/large_file.txt"
        })
        
        if size_result["success"]:
            size = size_result["result"]["size"]
            size_human = size_result["result"]["size_human"]
            print(f"File size: {size} bytes ({size_human})")
    
    finally:
        # Отключение от сервера
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### 6.2. Использование с кастомной конфигурацией retry

```python
import asyncio
from mcp import Client

async def main():
    client = Client("stdio")
    await client.connect()
    
    try:
        # Чтение файла с кастомной конфигурацией retry
        result = await client.call_tool("read_file", {
            "file_path": "/path/to/unstable_file.txt",
            "retry_config": {
                "max_attempts": 10,  # Увеличенное количество попыток
                "base_delay": 0.2,   # Уменьшенная базовая задержка
                "max_delay": 60.0    # Увеличенная максимальная задержка
            }
        })
        
        if result["success"]:
            print(f"Success after {result['metadata']['attempts']} attempts")
        else:
            print(f"Failed after {result['metadata']['attempts']} attempts")
            print(f"Error: {result['error']['message']}")
    
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### 6.3. Интеграция с Django-приложением

```python
# backend/core/mcp_file_reader.py
import os
from typing import Optional, Dict, Any
from mcp import Client
from .logging import get_logger

logger = get_logger(__name__)

class MCPFileReader:
    """Интеграция MCP-сервера с Django-приложением."""
    
    def __init__(self, server_path: str = "mcp-file-reader-server"):
        self.server_path = server_path
        self.client: Optional[Client] = None
    
    async def __aenter__(self):
        """Контекстный менеджер для автоматического подключения."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Контекстный менеджер для автоматического отключения."""
        await self.disconnect()
    
    async def connect(self):
        """Подключение к MCP-серверу."""
        if self.client is None:
            self.client = Client("stdio", [self.server_path])
            await self.client.connect()
            logger.info("mcp_connected", server_path=self.server_path)
    
    async def disconnect(self):
        """Отключение от MCP-сервера."""
        if self.client:
            await self.client.disconnect()
            self.client = None
            logger.info("mcp_disconnected", server_path=self.server_path)
    
    async def read_file(self, file_path: str, encoding: str = 'utf-8') -> Optional[str]:
        """Чтение файла через MCP-сервер."""
        await self.connect()
        
        try:
            result = await self.client.call_tool("read_file", {
                "file_path": file_path,
                "encoding": encoding
            })
            
            if result["success"]:
                logger.info(
                    "mcp_file_read_success",
                    file_path=file_path,
                    attempts=result["metadata"]["attempts"],
                    total_time=result["metadata"]["total_time"]
                )
                return result["result"]["content"]
            else:
                logger.error(
                    "mcp_file_read_error",
                    file_path=file_path,
                    error_code=result["error"]["code"],
                    error_message=result["error"]["message"],
                    attempts=result["metadata"]["attempts"]
                )
                return None
        
        except Exception as e:
            logger.error(
                "mcp_file_read_exception",
                file_path=file_path,
                exception=str(e)
            )
            return None
    
    async def read_json_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Чтение JSON файла через MCP-сервер."""
        await self.connect()
        
        try:
            result = await self.client.call_tool("read_json_file", {
                "file_path": file_path
            })
            
            if result["success"]:
                logger.info(
                    "mcp_json_read_success",
                    file_path=file_path,
                    attempts=result["metadata"]["attempts"]
                )
                return result["result"]["data"]
            else:
                logger.error(
                    "mcp_json_read_error",
                    file_path=file_path,
                    error_code=result["error"]["code"],
                    error_message=result["error"]["message"]
                )
                return None
        
        except Exception as e:
            logger.error(
                "mcp_json_read_exception",
                file_path=file_path,
                exception=str(e)
            )
            return None

# Использование в Django
async def load_config_from_mcp():
    """Загрузка конфигурации через MCP-сервер."""
    async with MCPFileReader() as reader:
        config = await reader.read_json_file("/opt/app/config.json")
        if config:
            return config
        else:
            raise Exception("Failed to load configuration")

# В Django view
from django.http import JsonResponse
from asgiref.sync import sync_to_async

async def api_file_content(request, file_path):
    """API эндпоинт для чтения файла через MCP."""
    async with MCPFileReader() as reader:
        content = await reader.read_file(file_path)
        
        if content is not None:
            return JsonResponse({
                "success": True,
                "content": content
            })
        else:
            return JsonResponse({
                "success": False,
                "error": "Failed to read file"
            }, status=500)
```

### 6.4. Мониторинг и метрики

```python
import asyncio
import time
from mcp import Client

async def monitor_mcp_performance():
    """Мониторинг производительности MCP-сервера."""
    client = Client("stdio")
    await client.connect()
    
    test_files = [
        "/path/to/small_file.txt",
        "/path/to/medium_file.txt",
        "/path/to/large_file.txt"
    ]
    
    metrics = {
        "total_requests": 0,
        "successful_requests": 0,
        "failed_requests": 0,
        "total_time": 0.0,
        "response_times": []
    }
    
    try:
        for file_path in test_files:
            start_time = time.time()
            
            result = await client.call_tool("read_file", {
                "file_path": file_path
            })
            
            end_time = time.time()
            response_time = end_time - start_time
            
            metrics["total_requests"] += 1
            metrics["total_time"] += response_time
            metrics["response_times"].append(response_time)
            
            if result["success"]:
                metrics["successful_requests"] += 1
                print(f"✓ {file_path}: {response_time:.3f}s (attempts: {result['metadata']['attempts']})")
            else:
                metrics["failed_requests"] += 1
                print(f"✗ {file_path}: {result['error']['message']}")
    
    finally:
        await client.disconnect()
    
    # Расчет статистики
    if metrics["total_requests"] > 0:
        metrics["success_rate"] = metrics["successful_requests"] / metrics["total_requests"]
        metrics["error_rate"] = metrics["failed_requests"] / metrics["total_requests"]
        metrics["average_response_time"] = metrics["total_time"] / metrics["total_requests"]
        metrics["min_response_time"] = min(metrics["response_times"])
        metrics["max_response_time"] = max(metrics["response_times"])
        
        # Сортировка для расчета перцентилей
        sorted_times = sorted(metrics["response_times"])
        n = len(sorted_times)
        metrics["p50_response_time"] = sorted_times[n // 2]
        metrics["p95_response_time"] = sorted_times[int(n * 0.95)]
        metrics["p99_response_time"] = sorted_times[int(n * 0.99)]
    
    # Вывод результатов
    print("\n=== Performance Metrics ===")
    print(f"Total requests: {metrics['total_requests']}")
    print(f"Successful requests: {metrics['successful_requests']}")
    print(f"Failed requests: {metrics['failed_requests']}")
    print(f"Success rate: {metrics.get('success_rate', 0):.2%}")
    print(f"Error rate: {metrics.get('error_rate', 0):.2%}")
    print(f"Average response time: {metrics.get('average_response_time', 0):.3f}s")
    print(f"Min response time: {metrics.get('min_response_time', 0):.3f}s")
    print(f"Max response time: {metrics.get('max_response_time', 0):.3f}s")
    print(f"P50 response time: {metrics.get('p50_response_time', 0):.3f}s")
    print(f"P95 response time: {metrics.get('p95_response_time', 0):.3f}s")
    print(f"P99 response time: {metrics.get('p99_response_time', 0):.3f}s")
    
    return metrics

if __name__ == "__main__":
    asyncio.run(monitor_mcp_performance())
```

---

Эта техническая спецификация предоставляет полное описание MCP-сервера для обработки ошибок чтения файлов, включая архитектуру, конфигурацию, API, зависимости и инструкции по развертыванию.