import sys
import json
from sentence_transformers import SentenceTransformer, util

# Ensure UTF-8 encoding for stdin/stdout
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

# Load the pre-trained Sentence-BERT model from Hugging Face
model = SentenceTransformer('paraphrase-multilingual-mpnet-base-v2')

def compute_best_matches(column_names, reference_terms, data_type=None):
    # Validate and clean column names
    valid_columns = [str(col).strip() for col in column_names if col and isinstance(col, (str, int, float)) and str(col).strip()]
    if not valid_columns:
        print("Warning: No valid column names provided", file=sys.stderr)
        return [{"column": col, "best_match": col, "score": 0.0, "standard": col} for col in column_names]

    # Debug: Log input columns and data type
    print(f"Input columns: {valid_columns}, Data type: {data_type or 'None'}", file=sys.stderr)

    # Encode valid column names with context (append data_type if provided)
    try:
        input_texts = [f"{col} ({data_type})" if data_type else col for col in valid_columns]
        col_embeddings = model.encode(input_texts, convert_to_tensor=True, show_progress_bar=False)
    except Exception as e:
        print(f"Error encoding columns: {str(e)}", file=sys.stderr)
        return [{"column": col, "best_match": col, "score": 0.0, "standard": col} for col in column_names]

    # Encode reference terms
    ref_terms_list = list(reference_terms.keys())
    try:
        ref_embeddings = model.encode(ref_terms_list, convert_to_tensor=True, show_progress_bar=False)
    except Exception as e:
        print(f"Error encoding reference terms: {str(e)}", file=sys.stderr)
        return [{"column": col, "best_match": col, "score": 0.0, "standard": col} for col in column_names]

    # Compute cosine similarities
    similarities = util.cos_sim(col_embeddings, ref_embeddings)

    results = []
    valid_idx = 0
    for i, col_name in enumerate(column_names):
        if col_name in valid_columns:
            best_score = -1
            best_term = str(col_name)
            best_standard = str(col_name)

            for j, ref_term in enumerate(ref_terms_list):
                score = float(similarities[valid_idx][j])
                if score > best_score:
                    best_score = score
                    best_term = ref_term
                    best_standard = reference_terms[ref_term]
            results.append({
                "column": str(col_name),
                "best_match": best_term,
                "score": best_score,
                "standard": best_standard
            })
            valid_idx += 1
        else:
            # Fallback for invalid columns
            results.append({
                "column": str(col_name),
                "best_match": str(col_name),
                "score": 0.0,
                "standard": str(col_name)
            })

    return results

if __name__ == "__main__":
    try:
        # Read input from Node.js
        input_data = json.loads(sys.stdin.read())
        column_names = input_data.get("column_names", [])
        reference_terms = input_data.get("reference_terms", {})
        data_type = input_data.get("data_type")  # Allow None

        # Compute the best matches
        results = compute_best_matches(column_names, reference_terms, data_type)

        # Output results as JSON
        print(json.dumps(results, ensure_ascii=False))
    except Exception as e:
        print(f"Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)