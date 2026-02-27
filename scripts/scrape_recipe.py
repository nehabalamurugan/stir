#!/usr/bin/env python3
"""
Recipe scraper script:
1) recipe-scrapers (wild_mode)
2) JSON-LD (@type Recipe)
3) WPRM DOM fallback
"""
import json
import re
import sys
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup
from recipe_scrapers import scrape_me


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
}


def _clean(s: Any) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip()


def _to_list(x: Any) -> List[Any]:
    if x is None:
        return []
    return x if isinstance(x, list) else [x]


def _servings_to_int(servings: Any, default: int = 4) -> int:
    s = _clean(servings)
    nums = re.findall(r"\d+", s)
    return int(nums[0]) if nums else default


def _parse_iso_duration(duration: Any) -> str:
    """
    Convert ISO 8601 duration (PT10M, PT30M, PT1H30M) to readable format (10 min, 30 min, 1h 30min).
    Also handles plain numbers (10, 30) and converts to "10 min", "30 min".
    Returns empty string if parsing fails.
    """
    if not duration:
        return ""
    
    duration_str = str(duration).strip().upper()
    
    # Check if it's an ISO 8601 duration format (starts with PT)
    if duration_str.startswith("PT"):
        # Parse ISO 8601 duration: PT[#H][#M][#S]
        # Examples: PT10M, PT30M, PT1H30M, PT45M
        hours = 0
        minutes = 0
        seconds = 0
        
        # Extract hours
        hour_match = re.search(r"(\d+)H", duration_str)
        if hour_match:
            hours = int(hour_match.group(1))
        
        # Extract minutes
        minute_match = re.search(r"(\d+)M", duration_str)
        if minute_match:
            minutes = int(minute_match.group(1))
        
        # Extract seconds (usually not needed for cooking times)
        second_match = re.search(r"(\d+)S", duration_str)
        if second_match:
            seconds = int(second_match.group(1))
        
        # Convert to readable format
        parts = []
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes} min")
        if seconds > 0 and hours == 0 and minutes == 0:
            # Only show seconds if no hours or minutes
            parts.append(f"{seconds} sec")
        
        if parts:
            return " ".join(parts)
        return duration_str  # Return original if we can't parse it
    
    # If it's just a number (like "10" or "30"), assume it's minutes
    if re.match(r"^\d+$", duration_str):
        return f"{duration_str} min"
    
    # If it's already in a readable format, return as is
    return duration_str


def _is_good(recipe: Dict[str, Any]) -> bool:
    title_ok = bool(_clean(recipe.get("title")))
    ing = recipe.get("ingredients") or []
    instr = recipe.get("instructions") or []
    return title_ok and (len(ing) >= 2 or len(instr) >= 2)


def _get_html(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=25)
    r.raise_for_status()
    return r.text


def _extract_recipe_scrapers(url: str) -> Dict[str, Any]:
    scraper = scrape_me(url, wild_mode=True)

    # recipe-scrapers total_time/prep_time/cook_time often returns minutes (int)
    prep = scraper.prep_time() if hasattr(scraper, "prep_time") else ""
    cook = scraper.cook_time() if hasattr(scraper, "cook_time") else ""
    total = scraper.total_time() if hasattr(scraper, "total_time") else ""

    instructions = []
    if hasattr(scraper, "instructions_list"):
        instructions = scraper.instructions_list() or []
    else:
        # fallback: instructions() returns a big string on some sites
        instr_text = scraper.instructions() if hasattr(scraper, "instructions") else ""
        instructions = [x.strip() for x in str(instr_text).split("\n") if x.strip()]

    data = {
        "title": _clean(scraper.title() if hasattr(scraper, "title") else ""),
        "description": _clean(scraper.description() if hasattr(scraper, "description") else ""),
        "prepTime": _parse_iso_duration(prep) if prep != "" else "",
        "cookTime": _parse_iso_duration(cook) if cook != "" else "",
        "totalTime": _parse_iso_duration(total) if total != "" else "",
        "servings": _servings_to_int(scraper.yields() if hasattr(scraper, "yields") else ""),
        "ingredients": scraper.ingredients() if hasattr(scraper, "ingredients") else [],
        "instructions": [_clean(x) for x in instructions if _clean(x)],
        "image": _clean(scraper.image() if hasattr(scraper, "image") else ""),
        "source": url,
        "extraction_method": "recipe-scrapers",
    }

    # If prep missing but total exists, set prepTime = totalTime (your current behavior)
    if not data["prepTime"] and data["totalTime"]:
        data["prepTime"] = data["totalTime"]

    return data


def _walk_jsonld(node: Any, out: List[Dict[str, Any]]) -> None:
    if isinstance(node, list):
        for x in node:
            _walk_jsonld(x, out)
        return
    if not isinstance(node, dict):
        return

    t = node.get("@type")
    if t == "Recipe" or (isinstance(t, list) and "Recipe" in t):
        out.append(node)

    if "@graph" in node:
        _walk_jsonld(node["@graph"], out)


def _extract_jsonld_recipe(html: str, url: str) -> Optional[Dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    scripts = soup.select('script[type="application/ld+json"]')

    recipes: List[Dict[str, Any]] = []
    for s in scripts:
        raw = s.string
        if not raw:
            continue
        raw = raw.strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        _walk_jsonld(data, recipes)

    if not recipes:
        return None

    r = recipes[0]

    # Ingredients
    ingredients = [_clean(x) for x in _to_list(r.get("recipeIngredient")) if _clean(x)]

    # Instructions can be list of strings, HowToStep dicts, or a single string
    instructions: List[str] = []
    for step in _to_list(r.get("recipeInstructions")):
        if isinstance(step, str):
            if _clean(step):
                instructions.append(_clean(step))
        elif isinstance(step, dict):
            txt = step.get("text") or step.get("name")
            if _clean(txt):
                instructions.append(_clean(txt))

    # Image
    img = r.get("image")
    image = ""
    if isinstance(img, str):
        image = img
    elif isinstance(img, list) and img and isinstance(img[0], str):
        image = img[0]
    elif isinstance(img, dict) and isinstance(img.get("url"), str):
        image = img["url"]

    servings = r.get("recipeYield")
    data = {
        "title": _clean(r.get("name")),
        "description": _clean(r.get("description")),
        "prepTime": _parse_iso_duration(_clean(r.get("prepTime"))),
        "cookTime": _parse_iso_duration(_clean(r.get("cookTime"))),
        "totalTime": _parse_iso_duration(_clean(r.get("totalTime"))),
        "servings": _servings_to_int(servings),
        "ingredients": ingredients,
        "instructions": instructions,
        "image": _clean(image),
        "source": url,
        "extraction_method": "json-ld",
    }

    if not data["prepTime"] and data["totalTime"]:
        data["prepTime"] = data["totalTime"]

    return data


def _extract_wprm(html: str, url: str) -> Optional[Dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    container = soup.select_one(".wprm-recipe-container, .wprm-recipe")
    if not container:
        return None

    title_el = container.select_one(".wprm-recipe-name")
    title = _clean(title_el.get_text(" ")) if title_el else ""

    ing_els = container.select(".wprm-recipe-ingredient")
    ingredients = [_clean(el.get_text(" ")) for el in ing_els if _clean(el.get_text(" "))]

    instr_els = container.select(".wprm-recipe-instruction-text")
    instructions = [_clean(el.get_text(" ")) for el in instr_els if _clean(el.get_text(" "))]

    servings_el = container.select_one(".wprm-recipe-servings")
    servings = _servings_to_int(servings_el.get_text(" ") if servings_el else "")

    img_el = container.select_one("img")
    image = ""
    if img_el and img_el.get("src"):
        image = _clean(img_el.get("src"))

    data = {
        "title": title,
        "description": "",
        "prepTime": "",
        "cookTime": "",
        "totalTime": "",
        "servings": servings,
        "ingredients": ingredients,
        "instructions": instructions,
        "image": image,
        "source": url,
        "extraction_method": "wprm-dom",
    }
    return data


def scrape_recipe(url: str) -> Dict[str, Any]:
    html = None

    # 1) recipe-scrapers
    try:
        data = _extract_recipe_scrapers(url)
        if _is_good(data):
            return data
    except Exception:
        pass

    # Fetch HTML once for fallbacks
    try:
        html = _get_html(url)
    except Exception as e:
        return {"error": f"Failed to fetch page HTML: {_clean(e)}"}

    # 2) JSON-LD
    try:
        data = _extract_jsonld_recipe(html, url)
        if data and _is_good(data):
            return data
    except Exception:
        pass

    # 3) WPRM DOM
    try:
        data = _extract_wprm(html, url)
        if data and _is_good(data):
            return data
    except Exception:
        pass

    return {
        "error": "Could not extract recipe data from this URL. Try another link or add manually.",
        "source": url,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "URL is required"}))
        sys.exit(1)

    url = sys.argv[1].strip()
    result = scrape_recipe(url)
    print(json.dumps(result, ensure_ascii=False))
