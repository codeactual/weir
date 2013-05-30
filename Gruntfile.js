module.exports = function(grunt) {
  'use strict';

  require('grunt-horde')
    .create(grunt)
    .demand('projName', 'weir')
    .demand('instanceName', 'weir')
    .demand('klassName', 'Weir')
    .loot('node-component-grunt')
    .attack();
};
