package main

const (
	BedrockAnthropicVersion = "bedrock-2023-05-31"
	BedrockContentType      = "application/json"
)

type BedrockMetrics struct {
	InvocationMetrics struct {
		InputTokenCount  int `json:"inputTokenCount"`
		OutputTokenCount int `json:"outputTokenCount"`
	} `json:"invocationMetrics"`
}

type BedrockMessageBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type BedrockMessage struct {
	Role    string                `json:"role"`
	Content []BedrockMessageBlock `json:"content"`
}

type BedrockCompletionRequest struct {
	AnthropicVersion string           `json:"anthropic_version"`
	MaxTokens        int              `json:"max_tokens"`
	Temperature      float32          `json:"temperature"`
	System           string           `json:"system,omitempty"`
	Messages         []BedrockMessage `json:"messages"`
}

type BedrockCompletionResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	StopReason string          `json:"stop_reason"`
	Model      string          `json:"model"`
	Metrics    *BedrockMetrics `json:"amazon-bedrock-invocationMetrics"`
}

type BedrockStreamCompletionResponse struct {
	Type  string `json:"type"`
	Index int    `json:"index"`
	Delta struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"delta"`
}

type BedrockConfig struct {
	Region        string
	AccessKeyID   string
	SecretKey     string
	SessionToken  string
	Temperature   float32
	DefaultSystem string
}
