package cmd

import (
	"errors"
	"fmt"
	"os"
	"path"

	"github.com/deepakjois/podscript/cmd/configure"
	"github.com/deepakjois/podscript/cmd/deepgram"
	"github.com/deepakjois/podscript/cmd/groq"
	"github.com/deepakjois/podscript/cmd/ytt"
	"github.com/deepakjois/podscript/cmd/assemblyai"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var rootCmd = &cobra.Command{
	Use:   "podscript",
	Short: "podscript generates podcast audio transcripts",
	Long: `A tool to generate transcripts for podcast audio files using LLM and
Speech-To-Text (STT) APIs.`,
}

var supportedLLMKeys = []string{
	"openai_api_key",
	"anthropic_api_key",
	"groq_api_key",
	"assemblyai_api_key",
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.AddCommand(configure.Command)
	rootCmd.AddCommand(ytt.Command)
	rootCmd.AddCommand(deepgram.Command)
	rootCmd.AddCommand(groq.Command)
	rootCmd.AddCommand(assemblyai.Command)
	rootCmd.CompletionOptions.DisableDefaultCmd = true
	rootCmd.SilenceUsage = true
}

func initConfig() {
	homeDir, err := os.UserHomeDir()
	cobra.CheckErr(err)

	viper.SetConfigType("toml")
	viper.SetConfigFile(path.Join(homeDir, ".podscript.toml"))

	// Bind env values to keys
	for _, k := range supportedLLMKeys {
		viper.BindEnv(k)
	}

	// Read in config file and ENV variables if set
	if err := viper.ReadInConfig(); err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			fmt.Printf("Error reading config file: %s\n", err)
		}
	}
}

func Execute() error {
	return rootCmd.Execute()
}
