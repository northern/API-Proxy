# Defines our Vagrant environment
#
# -*- mode: ruby -*-
# vi: set ft=ruby :

BOX      = 'ubuntu/xenial64'
HOSTNAME = 'admin'
RAM      = 2048
IP       = '192.168.1.200'
CPUS     = 2
CPUCAP   = 95

Vagrant.configure("2") do |config|

  config.vm.box = BOX
  config.vm.hostname = HOSTNAME

  #config.vm.network :private_network, ip: IP
  config.vm.network "private_network", type: "dhcp"

  config.vm.network :forwarded_port, host: 7080, guest: 8080, auto_correct: true

  config.vm.synced_folder ".", "/vagrant", nfs: true, mount_options: ['actimeo=1']

  config.ssh.forward_agent = true
  
  config.vm.provider "virtualbox" do |vm|
    vm.customize ["modifyvm", :id, "--memory", RAM]
    vm.customize ["modifyvm", :id, "--cpus", CPUS]
    vm.customize ["modifyvm", :id, "--cpuexecutioncap", CPUCAP]
  end

  config.vm.provision :shell, path: "vagrant/provision.sh"

end
