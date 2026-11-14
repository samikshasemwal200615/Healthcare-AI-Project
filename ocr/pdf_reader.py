"""PDF text extraction using PyMuPDF.

OS Concept: Uses a context manager (with statement) to ensure the
PDF document handle is properly closed even if an exception occurs,
preventing file descriptor leaks.
"""

import fitz  # -> PyMuPDF


def read_pdf(pdf_path: str) -> str:
    """Read all text from a PDF file.

    Uses a context manager to guarantee the document is closed,
    preventing resource leaks (OS concept: resource management).
    """
    with fitz.open(pdf_path) as document:
        pages = [page.get_text() for page in document]

    return "\n".join(pages)
