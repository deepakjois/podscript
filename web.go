package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"strings"

	aai "github.com/AssemblyAI/assemblyai-go-sdk"

	api "github.com/deepgram/deepgram-go-sdk/pkg/api/listen/v1/rest"
	interfaces "github.com/deepgram/deepgram-go-sdk/pkg/client/interfaces"
	client "github.com/deepgram/deepgram-go-sdk/pkg/client/listen"
)

//go:embed dist
var frontend embed.FS

type WebCmd struct {
	Dev  bool `help:"Run in development mode" default:"false"`
	Port int  `help:"Preferred port to run the server on" default:"8080"`
}

var modelConfigs = map[string]struct {
	Models  []string
	Default string
}{
	"ytt": {
		Models: []string{
			string(GPT4o),
			string(GPT4oMini),
			string(Claude35Sonnet),
			string(Claude35Haiku),
			string(Llama3370b),
			string(Llama318b),
			string(Gemini2Flash),
		},
		Default: string(GPT4o),
	},
	"aai": {
		Models:  []string{"best", "nano"},
		Default: "best",
	},
	"deepgram": {
		Models:  []string{"nova-2", "phonecall", "finance", "video"},
		Default: "nova-2",
	},
}

func (c *WebCmd) Run() error {
	if c.Dev && c.Port == 8080 {
		c.Port = 5170
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /settings", handleGetSettings)
	mux.HandleFunc("POST /settings", handlePostSettings)
	mux.HandleFunc("GET /models/{subcommand}", handleModels)
	mux.HandleFunc("GET /ytt", handleYTT)
	mux.HandleFunc("POST /audio", handleAudioTranscription)

	if !c.Dev {
		dist, err := fs.Sub(frontend, "dist")
		if err != nil {
			return fmt.Errorf("failed to get dist subfolder: %w", err)
		}
		mux.Handle("/", http.FileServer(http.FS(dist)))
	}

	fmt.Printf("Starting server on port %d\n", c.Port)
	return http.ListenAndServe(fmt.Sprintf(":%d", c.Port), mux)
}

func handleGetSettings(w http.ResponseWriter, r *http.Request) {
	config, err := ReadConfig()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

func handlePostSettings(w http.ResponseWriter, r *http.Request) {
	var config Config
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := WriteConfig(&config); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func handleModels(w http.ResponseWriter, r *http.Request) {
	subcommand := r.PathValue("subcommand")

	config, exists := modelConfigs[subcommand]
	if !exists {
		http.Error(w, "Subcommand not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"models":  config.Models,
		"default": config.Default,
	})
}

type AudioURLTranscriptionRequest struct {
	URL     string `json:"url"`
	Service string `json:"service"`
	Model   string `json:"model"`
}

type AudioURLTranscriptionResponse struct {
	Text string `json:"text"`
}

func jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func handleAudioTranscription(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var req AudioURLTranscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	config, err := ReadConfig()
	if err != nil {
		jsonError(w, "Failed to read config", http.StatusInternalServerError)
		return
	}

	var text string
	switch req.Service {
	case "deepgram":
		if config.DeepgramAPIKey == "" {
			jsonError(w, "Deepgram API key not configured", http.StatusUnauthorized)
			return
		}

		c := client.NewREST(config.DeepgramAPIKey, &interfaces.ClientOptions{})
		dg := api.New(c)

		options := &interfaces.PreRecordedTranscriptionOptions{
			Model:       req.Model,
			SmartFormat: true,
			Punctuate:   true,
			Diarize:     true,
			Utterances:  true,
		}

		res, err := dg.FromURL(r.Context(), req.URL, options)
		if err != nil {
			jsonError(w, fmt.Sprintf("Transcription failed: %v", err), http.StatusInternalServerError)
			return
		}
		text = res.Results.Channels[0].Alternatives[0].Paragraphs.Transcript

	case "aai":
		if config.AssemblyAIAPIKey == "" {
			jsonError(w, "AssemblyAI API key not configured", http.StatusUnauthorized)
			return
		}

		client := aai.NewClient(config.AssemblyAIAPIKey)
		params := &aai.TranscriptOptionalParams{
			SpeakerLabels: aai.Bool(true),
			Punctuate:     aai.Bool(true),
			FormatText:    aai.Bool(true),
			SpeechModel:   aai.SpeechModel(req.Model),
		}

		transcript, err := client.Transcripts.TranscribeFromURL(r.Context(), req.URL, params)
		if err != nil {
			jsonError(w, fmt.Sprintf("Transcription failed: %v", err), http.StatusInternalServerError)
			return
		}

		var builder strings.Builder
		for _, utterance := range transcript.Utterances {
			fmt.Fprintf(&builder, "Speaker %s: %s\n\n",
				aai.ToString(utterance.Speaker),
				aai.ToString(utterance.Text))
		}
		text = builder.String()

	default:
		jsonError(w, "Unsupported transcription service", http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(AudioURLTranscriptionResponse{Text: text})
}
