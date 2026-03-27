#!/usr/bin/env python3
"""
Reads HTML from stdin, generates a PDF using WeasyPrint, and writes binary PDF to stdout.
Usage: echo "<html>...</html>" | python3 generate_pdf.py
"""
import sys
import os

def main():
    html_content = sys.stdin.buffer.read().decode("utf-8")
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content, base_url=None).write_pdf()
        sys.stdout.buffer.write(pdf_bytes)
    except Exception as e:
        sys.stderr.write(f"WeasyPrint error: {e}\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
