#!/bin/bash

# Add swap space.
sh /vagrant/vagrant/swap.sh

# Provision prep and basic necessities.
apt-get update
#apt-get -y upgrade
apt-get -y install ntp git htop tree zip unzip python-simplejson
systemctl restart ntp.service

apt-get -y install linux-headers-$(uname -r) build-essential dkms

# Install Redis
apt-get -y install redis-server

# install NodeJS
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
apt-get install -y nodejs

sudo -H -u ubuntu bash -c 'cd /vagrant; npm install'
