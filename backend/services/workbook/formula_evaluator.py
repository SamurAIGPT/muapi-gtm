import re
from typing import Dict, Any, Optional

def evaluate_formula(formula_str: str, row_data: Dict[str, Any], enrichments: Dict[str, Any], col_map: Dict[str, str]) -> Any:
    """Safely evaluates spreadsheet formulas with column references like {Domain} or {First Name}."""
    if not formula_str or not isinstance(formula_str, str):
        return ""

    # Replace column references {Column Label} or {col_id} with their evaluated value
    def replace_var(match):
        token = match.group(1).strip()
        # Find column id
        col_id = col_map.get(token.lower()) or token
        val = None
        if col_id in row_data:
            val = row_data[col_id]
        elif col_id in enrichments:
            e = enrichments[col_id]
            val = e.get("value") if isinstance(e, dict) else e
        elif token in row_data:
            val = row_data[token]

        if val is None:
            return ""
        return str(val)

    # 1. Macro: DOMAIN({url_or_email})
    domain_match = re.match(r'^DOMAIN\((.+)\)$', formula_str.strip(), re.IGNORECASE)
    if domain_match:
        arg = re.sub(r'\{([^}]+)\}', replace_var, domain_match.group(1).strip())
        val = arg.strip('\'" ')
        if "@" in val:
            val = val.split("@")[-1]
        val = val.lower().replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]
        return val

    # 2. Macro: CONCAT(a, b, c, ...)
    concat_match = re.match(r'^CONCAT\((.+)\)$', formula_str.strip(), re.IGNORECASE)
    if concat_match:
        parts_str = concat_match.group(1)
        # Parse simple arguments separated by commas not inside quotes
        args = [p.strip().strip('\'"') for p in re.split(r',(?=(?:[^\'"]*[\'"][^\'"]*[\'"])*[^\'"]*$)', parts_str)]
        resolved = []
        for p in args:
            resolved_part = re.sub(r'\{([^}]+)\}', replace_var, p)
            resolved.append(resolved_part)
        return "".join(resolved)

    # 3. Macro: SPLIT(str, delimiter, index)
    split_match = re.match(r'^SPLIT\((.+)\)$', formula_str.strip(), re.IGNORECASE)
    if split_match:
        parts = [p.strip().strip('\'"') for p in split_match.group(1).split(",")]
        if len(parts) >= 2:
            src = re.sub(r'\{([^}]+)\}', replace_var, parts[0])
            delim = parts[1]
            idx = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
            splits = src.split(delim)
            return splits[idx] if 0 <= idx < len(splits) else ""

    # 4. Macro: LOWER / UPPER
    lower_match = re.match(r'^LOWER\((.+)\)$', formula_str.strip(), re.IGNORECASE)
    if lower_match:
        resolved_part = re.sub(r'\{([^}]+)\}', replace_var, lower_match.group(1).strip('\'" '))
        return resolved_part.lower()

    upper_match = re.match(r'^UPPER\((.+)\)$', formula_str.strip(), re.IGNORECASE)
    if upper_match:
        resolved_part = re.sub(r'\{([^}]+)\}', replace_var, upper_match.group(1).strip('\'" '))
        return resolved_part.upper()

    # 5. Macro: IF(condition, true_val, false_val)
    if_match = re.match(r'^IF\((.+)\)$', formula_str.strip(), re.IGNORECASE)
    if if_match:
        parts = [p.strip().strip('\'"') for p in if_match.group(1).split(",")]
        if len(parts) >= 3:
            cond = re.sub(r'\{([^}]+)\}', replace_var, parts[0])
            # Simple condition test
            is_truthy = bool(cond and cond != "0" and cond.lower() != "false" and cond.lower() != "null")
            return re.sub(r'\{([^}]+)\}', replace_var, parts[1] if is_truthy else parts[2])

    # Default: replace template tags like "Hello {First Name}, how is {Company}?"
    return re.sub(r'\{([^}]+)\}', replace_var, formula_str)
