/**
 * Logger utility for Vault Visualizer plugin
 * Provides consistent logging with plugin prefix and log levels
 * 
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Debug message', data);
 *   logger.info('Info message');
 *   logger.warn('Warning message', error);
 *   logger.error('Error message', error);
 */

export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	NONE = 4
}

class Logger {
	private prefix = '[Vault Visualizer]';
	private level: LogLevel = LogLevel.INFO;

	/**
	 * Set the minimum log level
	 * Messages below this level will not be logged
	 */
	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * Get the current log level
	 */
	getLevel(): LogLevel {
		return this.level;
	}

	/**
	 * Debug level logging - for detailed diagnostic information
	 */
	debug(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.DEBUG) {
			console.debug(`${this.prefix} [DEBUG]`, message, ...args);
		}
	}

	/**
	 * Info level logging - for general informational messages
	 */
	info(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			console.debug(`${this.prefix} [INFO]`, message, ...args);
		}
	}

	/**
	 * Warning level logging - for potentially harmful situations
	 */
	warn(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.WARN) {
			console.warn(`${this.prefix} [WARN]`, message, ...args);
		}
	}

	/**
	 * Error level logging - for error events
	 */
	error(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.ERROR) {
			console.error(`${this.prefix} [ERROR]`, message, ...args);
		}
	}

	/**
	 * Log without level prefix (for backward compatibility)
	 */
	log(message: string, ...args: unknown[]): void {
		if (this.level <= LogLevel.INFO) {
			console.debug(`${this.prefix}`, message, ...args);
		}
	}
}

// Export singleton instance
export const logger = new Logger();
