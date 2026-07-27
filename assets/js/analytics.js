'use strict';

(function analyticsModule(global) {
  const root = global.ThePan = global.ThePan || {};
  const allowedEvents = new Set([
    'image_upload',
    'effect_used',
    'random_distort',
    'reset_tool',
    'image_export',
    'tool_error',
    'surprise_me',
    'preset_used',
    'compare_used',
    'gallery_add',
    'gallery_select',
    'gallery_restore',
    'gallery_delete',
    'gallery_clear',
    'gallery_favorite',
    'share_open',
    'share_success',
    'share_cancel',
    'share_fallback',
    'credit_copy'
  ]);
  const allowedParameters = {
    effect_used: new Set(['effect_name']),
    tool_error: new Set(['error_type']),
    surprise_me: new Set(['preset_family']),
    preset_used: new Set(['preset_name']),
    compare_used: new Set(['compare_mode'])
  };
  let context = Object.freeze({ tool_id: '', tool_version: '' });

  function configure(toolId, toolVersion) {
    const safe = /^[a-z0-9_-]+$/;
    context = Object.freeze({
      tool_id: safe.test(toolId) ? toolId : '',
      tool_version: safe.test(toolVersion) ? toolVersion : ''
    });
  }

  function track(eventName, parameters) {
    if (!allowedEvents.has(eventName)) return false;
    const event = { event: eventName };
    if (context.tool_id) event.tool_id = context.tool_id;
    if (context.tool_version) event.tool_version = context.tool_version;
    const allowed = allowedParameters[eventName];
    if (allowed && parameters) {
      for (const key of allowed) {
        const value = parameters[key];
        if (typeof value === 'string' && /^[a-z0-9_-]{1,48}$/.test(value)) event[key] = value;
      }
    }
    global.dataLayer = global.dataLayer || [];
    global.dataLayer.push(event);
    return true;
  }

  root.analytics = Object.freeze({ configure, track, allowedEvents: Object.freeze([...allowedEvents]) });
}(window));
