#!/bin/bash

if [[ $# -ne 4 ]]; then
    echo "Please provide the target registry and helm charts as parameters, e.g., "
    echo "$1 docker.io/your-username/ keptn-0.8.4.tgz helm-service-0.8.4.tgz jmeter-service-0.8.4.tgz"
    exit 1
fi

TARGET_INTERNAL_DOCKER_REGISTRY=${1}
KEPTN_HELM_CHART=${2}
KEPTN_HELM_SERVICE_HELM_CHART=${3}
KEPTN_JMETER_SERVICE_HELM_CHART=${3}

helm upgrade keptn "./$KEPTN_HELM_CHART" --install -n keptn --create-namespace --wait --set=control-plane.apiGatewayNginx.type=LoadBalancer,continuous-delivery.enabled=true,\
control-plane.mongodb.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}centos/mongodb-36-centos7,\
control-plane.nats.nats.image=${TARGET_INTERNAL_DOCKER_REGISTRY}nats:2.1.9-alpine3.12,\
control-plane.nats.reloader.image=${TARGET_INTERNAL_DOCKER_REGISTRY}connecteverything/nats-server-config-reloader:0.6.0,\
control-plane.nats.exporter.image=${TARGET_INTERNAL_DOCKER_REGISTRY}synadia/prometheus-nats-exporter:0.5.0,\
control-plane.apiGatewayNginx.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}nginxinc/nginx-unprivileged:1.19.4-alpine,\
control-plane.remediationService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/remediation-service,\
control-plane.apiService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/api,\
control-plane.bridge.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/bridge2,\
control-plane.distributor.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/distributor,\
control-plane.shipyardController.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/shipyard-controller,\
control-plane.configurationService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/configuration-service,\
control-plane.mongodbDatastore.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/mongodb-datastore,\
control-plane.statisticsService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/statistics-service,\
control-plane.lighthouseService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/lighthouse-service,\
control-plane.secretService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/secret-service,\
control-plane.approvalService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/approval-service,\
continuous-delivery.distributor.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/distributor,\
continuous-delivery.helmService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/helm-service,\
continuous-delivery.jmeterService.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/jmeter-service\
/

helm upgrade helm-service "./$KEPTN_HELM_SERVICE_HELM_CHART" --install -n keptn --set=helmservice.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/helm-service,\
distributor.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/distributor\
/

helm upgrade jmeter-service "./$KEPTN_HELM_SERVICE_HELM_CHART" --install -n keptn --set=jmeterservice.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/jmeter-service,\
distributor.image.repository=${TARGET_INTERNAL_DOCKER_REGISTRY}keptn/distributor\
/

