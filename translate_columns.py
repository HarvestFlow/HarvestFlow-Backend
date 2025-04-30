
import sys
import json
from transformers import pipeline

# Ensure UTF-8 encoding for stdin/stdout
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

try:
    # Load translation model (requires sentencepiece)
    translator = pipeline("translation", model="Helsinki-NLP/opus-mt-mul-en")
except Exception as e:
    print(f"Failed to load translator: {str(e)}", file=sys.stderr)
    translator = None

def translate_text(text, source_lang, target_lang):
    # If source and target languages are the same, return original text
    if source_lang == target_lang:
        return text if isinstance(text, list) else [text]
    
    # Handle single string or list of strings
    input_text = text if isinstance(text, list) else [text]
    translated_text = []
    
    if translator is None:
        print("Warning: Translator not available, returning original text", file=sys.stderr)
        return input_text
    
    for item in input_text:
        try:
            # Ensure item is a non-empty string
            item = str(item).strip()
            if not item:
                translated_text.append(item)
                continue
            # Translate to English
            translation = translator(item, src_lang=source_lang, tgt_lang='en')[0]['translation_text']
            translated_text.append(translation)
            print(f"Translated '{item}' to '{translation}'", file=sys.stderr)
        except Exception as e:
            print(f"Translation error for '{item}': {str(e)}", file=sys.stderr)
            translated_text.append(item)  # Fallback to original text
    
    return translated_text

if __name__ == "__main__":
    try:
        # Read input from Node.js
        input_data = json.loads(sys.stdin.read())
        text = input_data["text"]
        source_lang = input_data["source_lang"]
        target_lang = input_data["target_lang"]

        # Translate text
        translated_text = translate_text(text, source_lang, target_lang)

        # Output results as JSON
        print(json.dumps({"translated_text": translated_text}, ensure_ascii=False))
    except Exception as e:
        print(f"Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)
