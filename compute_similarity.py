import sys
import json
from sentence_transformers import SentenceTransformer, util

# Load the multilingual Sentence-BERT model
model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

def compute_best_matches(column_names, reference_terms):
    # Encode all column names
    col_embeddings = model.encode(column_names, convert_to_tensor=True)

    # Encode all reference terms
    ref_terms_list = list(reference_terms.keys())
    ref_embeddings = model.encode(ref_terms_list, convert_to_tensor=True)

    # Compute cosine similarities for all columns at once
    similarities = util.cos_sim(col_embeddings, ref_embeddings)

    results = []
    for i, col_name in enumerate(column_names):
        best_score = -1
        best_term = col_name
        best_standard = col_name

        for j, ref_term in enumerate(ref_terms_list):
            score = float(similarities[i][j])  # Convert tensor to float
            if score > best_score:
                best_score = score
                best_term = ref_term
                best_standard = reference_terms[ref_term]

        results.append({
            "column": col_name,
            "best_match": best_term,
            "score": best_score,
            "standard": best_standard
        })

    return results

if __name__ == "__main__":
    # Read input from Node.js (passed as JSON string via stdin)
    input_data = json.loads(sys.stdin.read())

    column_names = input_data["column_names"]
    reference_terms = input_data["reference_terms"]

    # Compute the best matches for all columns
    results = compute_best_matches(column_names, reference_terms)

    # Output the results as JSON to stdout
    print(json.dumps(results))