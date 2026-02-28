"""arXiv keyword search helper for FORGE Streamlit prototype."""

import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


def search_arxiv(query: str, max_results: int = 5) -> list[dict]:
    """Search arXiv by keyword query.

    Returns a list of dicts with keys: title, arxiv_id, abstract, authors, published.
    """
    if not query.strip():
        return []

    encoded = urllib.parse.quote(query)
    url = (
        f"http://export.arxiv.org/api/query"
        f"?search_query=all:{encoded}"
        f"&start=0&max_results={max_results}"
        f"&sortBy=relevance&sortOrder=descending"
    )

    try:
        response = urllib.request.urlopen(url, timeout=30)
        xml_data = response.read()
        root = ET.fromstring(xml_data)
        ns = {"default": "http://www.w3.org/2005/Atom"}

        results = []
        for entry in root.findall("default:entry", ns):
            entry_id = entry.find("default:id", ns)
            if entry_id is None or entry_id.text is None:
                continue

            # Extract the arXiv ID from the full URL
            raw_id = entry_id.text.strip().split("/")[-1]

            title_el = entry.find("default:title", ns)
            abstract_el = entry.find("default:summary", ns)

            results.append(
                {
                    "arxiv_id": raw_id,
                    "title": (
                        title_el.text.strip().replace("\n", " ")
                        if title_el is not None and title_el.text
                        else "Untitled"
                    ),
                    "abstract": (
                        abstract_el.text.strip().replace("\n", " ")[:300]
                        if abstract_el is not None and abstract_el.text
                        else ""
                    ),
                    "authors": [
                        a.find("default:name", ns).text
                        for a in entry.findall("default:author", ns)
                        if a.find("default:name", ns) is not None
                    ],
                    "published": (
                        entry.find("default:published", ns).text
                        if entry.find("default:published", ns) is not None
                        else ""
                    ),
                }
            )

        return results

    except Exception:
        return []
