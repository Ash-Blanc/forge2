"""Custom Agent Tools for FORGE."""

import urllib.request
import urllib.parse
import json
from agno.tools import Toolkit
from agno.utils.log import logger

class SemanticScholarTools(Toolkit):
    def __init__(self, **kwargs):
        super().__init__(name="semantic_scholar_tools")
        self.register(self.search_papers)

    def search_papers(self, query: str, limit: int = 5, year: str = "2022-2025") -> str:
        """
        Search Semantic Scholar for recent academic papers and preprints on a specific topic.
        
        Args:
            query (str): The search query (e.g. "automated API testing LLM").
            limit (int): The maximum number of papers to return (default: 5).
            year (str): The publication year range (default: "2022-2025").
            
        Returns:
            str: A JSON-formatted string containing the top paper matches, including their 
                 title, abstract, year, and arxivId (if available).
        """
        logger.info(f"Searching Semantic Scholar for: '{query}'")
        
        # We need specific fields to make a relevant startup connection
        fields = "title,abstract,year,externalIds"
        
        # Clean and truncate query to prevent 500 errors from overly long/complex searches
        clean_query = " ".join(query.split()[:8]) if len(query.split()) > 8 else query
        
        # Build the URL
        params = {
            "query": clean_query,
            "limit": str(limit),
            "fields": fields,
            "year": year
        }
        
        encoded_params = urllib.parse.urlencode(params)
        url = f"https://api.semanticscholar.org/graph/v1/paper/search?{encoded_params}"
        
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FORGE-Agent/1.0"})
            
            # Simple retry mechanism for rate limits
            max_retries = 3
            data = None
            for attempt in range(max_retries):
                try:
                    with urllib.request.urlopen(req, timeout=30) as response:
                        if response.status != 200:
                            return f"Error: Semantic Scholar API returned status {response.status}"
                        data = json.loads(response.read().decode("utf-8"))
                        break # Success, exit retry loop
                except urllib.error.HTTPError as he:
                    if he.code == 429 and attempt < max_retries - 1:
                        sleep_time = 3 * (2 ** attempt)
                        logger.warning(f"Semantic Scholar rate limit hit. Retrying in {sleep_time} seconds...")
                        import time
                        time.sleep(sleep_time)
                        continue
                    elif he.code >= 500 and attempt < max_retries - 1:
                        sleep_time = 3 * (2 ** attempt)
                        logger.warning(f"Semantic Scholar server error {he.code}. Retrying in {sleep_time} seconds...")
                        import time
                        time.sleep(sleep_time)
                        continue
                    else:
                        raise he
                
            if not data or "data" not in data or not data["data"]:
                return "No papers found for the given query."
                
            results = []
            for paper in data["data"]:
                # Filter for papers that have an arXiv ID if possible, 
                # but we'll include others just in case as a fallback
                arxiv_id = paper.get("externalIds", {}).get("ArXiv", "")
                
                results.append({
                    "title": paper.get("title", "Unknown Title"),
                    "year": paper.get("year", "Unknown"),
                    "abstract": paper.get("abstract", "No abstract available.")[:1000] + "...", 
                    "arxivId": arxiv_id
                })
            
            return json.dumps(results, indent=2)
                
        except Exception as e:
            logger.error(f"Semantic Scholar API error: {e}")
            return f"Error occurred while searching Semantic Scholar: {str(e)}"
