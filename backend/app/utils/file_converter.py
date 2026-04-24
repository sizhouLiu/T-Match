import base64
import io
import pymupdf
import docx

async def pdf_to_images_b64(file_bytes: bytes, max_pages: int = 10) -> list[str]:
    images_b64 = []
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    for page_num in range(min(len(doc), max_pages)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        images_b64.append(base64.b64encode(img_bytes).decode("utf-8"))
    doc.close()
    return images_b64

async def docx_to_text(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
