package cmd

import (
	"fmt"
	"os"
	"path"

	"github.com/deepakjois/podscript/cmd/configure"
	"github.com/deepakjois/podscript/cmd/ytt"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var rootCmd = &cobra.Command{
	Use:   "podscript",
	Short: "podscript - generate podcast transcripts",
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.AddCommand(configure.Command)
	rootCmd.AddCommand(ytt.Command)
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}

func initConfig() {
	homeDir, err := os.UserHomeDir()
	cobra.CheckErr(err)

	viper.SetConfigType("toml")
	viper.SetConfigFile(path.Join(homeDir, ".podscript.toml"))

	viper.SetEnvPrefix("PODSCRIPT")
	viper.AutomaticEnv()

	// Read in config file and ENV variables if set
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// Config file was found but another error was produced
			fmt.Printf("Error reading config file: %s\n", err)
		}
	}
}

func Execute() error {
	return rootCmd.Execute()
}
