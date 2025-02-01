package main

import (
	"fmt"
	"net/http"
	"strings"
)

func handleYTT(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "URL parameter is required", http.StatusBadRequest)
		return
	}

	modelStr := r.URL.Query().Get("model")
	if modelStr == "" {
		http.Error(w, "Model parameter is required", http.StatusBadRequest)
		return
	}
	model := LLMModel(modelStr)

	config, err := ReadConfig()
	if err != nil {
		http.Error(w, "Failed to read config", http.StatusInternalServerError)
		return
	}

	var apiKey string
	switch model {
	case GPT4o, GPT4oMini:
		if config.OpenAIAPIKey == "" {
			http.Error(w, fmt.Sprintf("OpenAI API key required for model %s", model), http.StatusBadRequest)
			return
		}
		apiKey = config.OpenAIAPIKey
	case Claude35Sonnet, Claude35Haiku:
		if config.AnthropicAPIKey == "" {
			http.Error(w, fmt.Sprintf("Anthropic API key required for model %s", model), http.StatusBadRequest)
			return
		}
		apiKey = config.AnthropicAPIKey
	case Llama3370b, Llama318b:
		if config.GroqAPIKey == "" {
			http.Error(w, fmt.Sprintf("Groq API key required for model %s", model), http.StatusBadRequest)
			return
		}
		apiKey = config.GroqAPIKey
	default:
		http.Error(w, "Unsupported model", http.StatusBadRequest)
		return
	}

	provider := getProviderForModel(model)
	client, err := NewLLMClient(provider, apiKey)
	if err != nil {
		http.Error(w, "Failed to initialize LLM client", http.StatusInternalServerError)
		return
	}

	// Set up SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	transcriber := NewYouTubeTranscriber(client, model)
	err = transcriber.Transcribe(r.Context(), url, func(text string, done bool) error {
		// Format multi-line SSE message by prefixing each line with "data: "
		// fmt.Printf("text (with whitespace): %q\n", text)
		lines := strings.Split(text, "\n")
		for i, line := range lines {
			if i > 0 {
				_, err := fmt.Fprint(w, "\n")
				if err != nil {
					return err
				}
			}
			_, err := fmt.Fprintf(w, "data: %s", line)
			if err != nil {
				return err
			}
		}
		_, err := fmt.Fprint(w, "\n\n")
		if err != nil {
			return err
		}

		if done {
			_, err := fmt.Fprint(w, "event: done\ndata: \n\n")
			if err != nil {
				return err
			}
		}

		flusher.Flush()
		return nil
	})

	if err != nil {
		fmt.Fprintf(w, "event: error\ndata: %s\n\n", err.Error())
		flusher.Flush()
	}
}

func getProviderForModel(model LLMModel) LLMProvider {
	switch model {
	case GPT4o, GPT4oMini:
		return OpenAI
	case Claude35Sonnet, Claude35Haiku:
		return Claude
	case Llama3370b, Llama318b:
		return Groq
	default:
		return ""
	}
}
