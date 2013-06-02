module.exports = function(grunt) {
  'use strict';

  require('grunt-horde')
    .create(grunt)
    .demand('initConfig.projName', 'weir')
    .demand('initConfig.instanceName', 'weir')
    .demand('initConfig.klassName', 'Weir')
    .loot('node-component-grunt')
    .attack();
};
