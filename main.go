package main

import (
	"os"

	"github.com/deepakjois/podscript/cmd"
)

func main() {
	if err := cmd.Execute(); err != nil {
		os.Exit(1)
	}
}
