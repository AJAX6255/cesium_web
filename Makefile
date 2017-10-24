SHELL = /bin/bash
SUPERVISORD=FLAGS=$$FLAGS supervisord -c baselayer/conf/supervisor/supervisor.conf
SUPERVISORCTL=FLAGS=$$FLAGS supervisorctl -c baselayer/conf/supervisor/supervisor.conf
ENV_SUMMARY=PYTHONPATH=. ./baselayer/tools/env_summary.py $$FLAGS
ESLINT=./node_modules/.bin/eslint

.DEFAULT_GOAL := run

bundle = ./static/build/bundle.js
webpack = ./node_modules/.bin/webpack
baselayer_branch = $(shell git config -f .gitmodules submodule.baselayer.branch)

baselayer/README.md:
	git submodule update --init --remote
	$(MAKE) baselayer-update

.PHONY: baselayer-update
baselayer-update:
	./baselayer/tools/submodule_update.sh

dependencies: baselayer/README.md
	@./baselayer/tools/silent_monitor.py pip install -r baselayer/requirements.txt
	@./baselayer/tools/silent_monitor.py pip install -r requirements.txt
	@./baselayer/tools/silent_monitor.py ./baselayer/tools/check_js_deps.sh

db_init:
	@PYTHONPATH=. ./baselayer/tools/silent_monitor.py ./baselayer/tools/db_init.py

db_clear:
	PYTHONPATH=. ./baselayer/tools/db_init.py -f

$(bundle): webpack.config.js package.json
	$(webpack)

bundle: $(bundle)

bundle-watch:
	$(webpack) -w

paths:
	@mkdir -p log run tmp
	@mkdir -p log/sv_child
	@mkdir -p ~/.local/cesium/logs

fill_conf_values:
	PYTHONPATH=. ./baselayer/tools/fill_conf_values.py

log: paths
	./baselayer/tools/watch_logs.py

run: paths dependencies fill_conf_values
	@echo "Supervisor will now fire up various micro-services."
	@echo
	@echo " - Run \`make log\` in another terminal to view logs"
	@echo " - Run \`make monitor\` in another terminal to restart services"
	@echo
	@echo "The server is in debug mode:"
	@echo "  JavaScript and Python files will be reloaded upon change."
	@echo

	@FLAGS="--debug" && \
	$(ENV_SUMMARY) && echo && \
	echo "Press Ctrl-C to abort the server" && \
	echo && \
	$(SUPERVISORD)

run_production:
	export FLAGS="--config config.yaml" && \
	$(ENV_SUMMARY) && \
	$(SUPERVISORD)

run_testing: paths dependencies
	export FLAGS="--config _test_config.yaml" && \
	$(ENV_SUMMARY) && \
	$(SUPERVISORD)

monitor:
	@echo "Entering supervisor control panel."
	@echo " - Type \`status\` too see microservice status"
	$(SUPERVISORCTL) -i status

# Attach to terminal of running webserver; useful to, e.g., use pdb
attach:
	$(SUPERVISORCTL) fg app

clean:
	rm $(bundle)

test_headless: paths dependencies fill_conf_values
	PYTHONPATH='.' xvfb-run ./tools/test_frontend.py

test: paths dependencies fill_conf_values
	PYTHONPATH='.' ./tools/test_frontend.py

stop:
	$(SUPERVISORCTL) stop all

status:
	PYTHONPATH='.' ./baselayer/tools/supervisor_status.py

docker-images:
	# Add --no-cache flag to rebuild from scratch
	docker build -t cesium/web . && docker push cesium/web

# Call this target to see which Javascript dependencies are not up to date
check-js-updates:
	./baselayer/tools/check_js_updates.sh
