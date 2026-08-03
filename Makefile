.PHONY: clean
clean:
	rm -rf node_modules

.PHONY: install
install:
	pnpm i

.PHONY: reinstall
reinstall: clean install

.PHONY: doc
doc:
	rm -rf docs/.vitepress/cache
	pnpm docs

.PHONY: doc-build
doc-build:
	rm -rf docs/.vitepress/cache
	pnpm docs:build

.PHONY: build
build: reinstall
	pnpm build

.PHONY: check
check: reinstall
	pnpm check