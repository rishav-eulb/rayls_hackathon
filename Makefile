# Makefile for publishing movement modules
include .env

# Variables
PUBLISH_SCRIPT=./deploy/publish_movement_module.sh
COMPILE_SCRIPT=./deploy/compile_movement_module.sh
MODULES = NexusUtils NexusFA NexusBridge

# Targets
.PHONY: publish upgrade NexusUtils NexusFA NexusBridge UpgradeNexusUtils UpgradeNexusFA \
	UpgradeNexusBridge setup_movement test

publish: NexusUtils NexusFA NexusBridge
upgrade: $(foreach module,$(MODULES),movement/$(module)/build/$(module)/package-metadata.bcs)

NexusUtils movement/NexusUtils/addresses.json:
	@echo "Publishing NexusUtils..."
	$(PUBLISH_SCRIPT) NexusUtils

NexusFA movement/NexusFA/addresses.json: movement/NexusUtils/addresses.json
	@echo "Publishing NexusFA..."
	$(PUBLISH_SCRIPT) NexusFA

NexusBridge movement/NexusBridge/addresses.json: movement/NexusFA/addresses.json
	@echo "Publishing NexusBridge..."
	$(PUBLISH_SCRIPT) NexusBridge

UpgradeNexusUtils movement/NexusUtils/build/NexusUtils/package-metadata.bcs:
	@echo "Upgrading NexusUtils..."
	if ! [ -e movement/NexusUtils/addresses.json ] ; then \
        echo "NexusUtils addresses file missing"; false; \
    fi;
	${COMPILE_SCRIPT} NexusUtils
	yarn upgrade-aptos-module NexusUtils

UpgradeNexusFA movement/NexusFA/build/NexusFA/package-metadata.bcs:
	@echo "Upgrading NexusFA..."
	if ! [ -e movement/NexusFA/addresses.json ] ; then \
        echo "NexusFA addresses file missing"; false; \
    fi;
	${COMPILE_SCRIPT} NexusFA
	yarn upgrade-aptos-module NexusFA

UpgradeNexusBridge movement/NexusBridge/build/NexusBridge/package-metadata.bcs:
	@echo "Upgrading NexusBridge..."
	if ! [ -e movement/NexusBridge/addresses.json ] ; then \
        echo "NexusBridge addresses file missing"; false; \
    fi;
	${COMPILE_SCRIPT} NexusBridge
	yarn upgrade-aptos-module NexusBridge

setup_movement: movement/NexusBridge/addresses.json
	${COMPILE_SCRIPT} NexusBridge
	cd movement/NexusBridge && \
	movement move run-script --compiled-script-path build/NexusBridge/bytecode_scripts/setup.mv --profile ${PROFILE}

test::
	cd movement/NexusUtils && aptos move test --dev
	cd movement/NexusFA && aptos move test --dev
	cd movement/NexusBridge && aptos move test --dev
