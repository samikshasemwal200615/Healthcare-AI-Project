"""Thread-safe SQLite connection manager.

Demonstrates OS concepts:
- threading.Lock for write serialization (synchronization primitive)
- threading.local() for per-thread connection isolation
- WAL journal mode for concurrent read access
- Resource management with explicit close()

ACID support:
- Atomicity: execute_transaction() commits or rolls back as a unit
- Consistency: PRAGMA foreign_keys=ON enforces FK constraints
- Isolation: write lock prevents concurrent write interference
- Durability: committed data persists in the .db file
"""

import sqlite3
import threading
import logging

logger = logging.getLogger("healthcare.db")


class DatabaseManager:
    """Singleton database manager with thread-safe write access.

    Each thread gets its own connection via threading.local().
    Write operations are serialized through a threading.Lock to
    prevent SQLite "database is locked" errors.
    """

    _instance = None
    _init_lock = threading.Lock()

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._write_lock = threading.Lock()  # OS: synchronization primitive
        self._local = threading.local()      # OS: thread-local storage
        self._all_conns = []
        self._conns_lock = threading.Lock()
        logger.info(
            f"DatabaseManager initialized | path={db_path} | "
            f"thread={threading.current_thread().name}"
        )

    @classmethod
    def get_instance(cls, db_path: str = None) -> "DatabaseManager":
        """Get or create the singleton instance (double-checked locking)."""
        if cls._instance is None:
            with cls._init_lock:
                if cls._instance is None:
                    if db_path is None:
                        try:
                            from app.config import DATABASE_PATH
                            db_path = DATABASE_PATH
                        except Exception:
                            raise RuntimeError(
                                "DatabaseManager not initialized. Provide db_path."
                            )
                    cls._instance = cls(db_path)
        return cls._instance

    @classmethod
    def reset(cls):
        """Reset the singleton (used in testing)."""
        if cls._instance is not None:
            cls._instance.close_all()
        cls._instance = None

    def get_connection(self) -> sqlite3.Connection:
        """Get a thread-local database connection.

        Each thread gets its own connection because sqlite3 connections
        are not safe to share across threads.
        """
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row       # access columns by name
            conn.execute("PRAGMA journal_mode=WAL")  # concurrent reads
            conn.execute("PRAGMA foreign_keys=ON")   # enforce FK constraints
            self._local.conn = conn
            with self._conns_lock:
                self._all_conns.append(conn)
            logger.debug(
                f"New DB connection | thread={threading.current_thread().name}"
            )
        return self._local.conn

    def execute_transaction(self, callback):
        """Execute a callback inside a serialized, atomic transaction.

        The callback receives a sqlite3.Connection and should perform
        its operations on it. If the callback succeeds, the transaction
        is committed; if it raises, the transaction is rolled back.

        Uses threading.Lock to serialize writes (OS synchronization).

        Args:
            callback: A callable(conn) -> result

        Returns:
            Whatever the callback returns.

        Raises:
            Re-raises any exception from the callback after rollback.
        """
        with self._write_lock:
            conn = self.get_connection()
            try:
                result = callback(conn)
                conn.commit()
                logger.debug("Transaction committed")
                return result
            except Exception as e:
                conn.rollback()
                logger.error(f"Transaction rolled back: {e}")
                raise

    def execute_script(self, script: str) -> None:
        """Execute a multi-statement SQL script (e.g., schema init).

        executescript() issues its own COMMIT, so we only need the
        write lock for serialization.
        """
        with self._write_lock:
            conn = self.get_connection()
            conn.executescript(script)
            logger.debug("SQL script executed")

    def execute_read(self, query: str, params: tuple = ()) -> list[sqlite3.Row]:
        """Execute a SELECT query. Reads don't need the write lock
        because WAL mode supports concurrent readers."""
        conn = self.get_connection()
        return conn.execute(query, params).fetchall()

    def execute_read_one(
        self, query: str, params: tuple = ()
    ) -> sqlite3.Row | None:
        """Execute a SELECT query and return a single row or None."""
        conn = self.get_connection()
        return conn.execute(query, params).fetchone()

    def close(self):
        """Close the thread-local connection (resource cleanup)."""
        if hasattr(self._local, "conn") and self._local.conn is not None:
            conn = self._local.conn
            try:
                conn.close()
            except Exception:
                pass
            self._local.conn = None
            with self._conns_lock:
                if conn in self._all_conns:
                    self._all_conns.remove(conn)
            logger.debug(
                f"Connection closed | thread={threading.current_thread().name}"
            )

    def close_all(self):
        """Close all connections across all threads."""
        with self._conns_lock:
            for conn in self._all_conns:
                try:
                    conn.close()
                except Exception:
                    pass
            self._all_conns.clear()
        if hasattr(self._local, "conn"):
            self._local.conn = None
        logger.debug("All database connections closed")
