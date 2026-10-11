#  LittleSDK Bootstrapping
SDK_PATH=deps/sdk
SDK_MODULES=js
include $(if $(SDK_PATH),$(shell test ! -e "$(SDK_PATH)/setup.mk" && git clone git@github.com:littletoolkit/littlesdk.git "$(SDK_PATH)";echo "$(SDK_PATH)/setup.mk"))

# --
# Fetch the third-party dependencies declared in .gitdeps (path, git URL, ref).
# deps/ is gitignored and is only needed by the CLI entry and the Markdown
# conformance suite; the web entry builds without any of it.
.PHONY: deps
deps: ## Clones the third-party dependencies listed in .gitdeps
	@while read -r path url ref; do \
		case "$$path" in ''|'#'*) continue ;; esac; \
		if [ -d "$$path/.git" ]; then \
			echo "[deps] $$path already present"; \
			continue; \
		fi; \
		echo "[deps] cloning $$path ($$ref)"; \
		git clone --quiet "$$url" "$$path" && git -C "$$path" checkout --quiet "$$ref"; \
	done < .gitdeps

# EOF

