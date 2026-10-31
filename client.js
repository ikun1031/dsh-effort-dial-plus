/**
 * Effort Dial Plus — browser half.
 *
 * A merge of two community plugins:
 *  - dsh-effort-dial: the Codex card structure (bolt glyph, level title, reset
 *    glyph, model row / max-level quota warning, segmented slider, model list
 *    view, level-driven accent colors).
 *  - reasoning-slider: the max-level blue→purple gradient with flowing energy
 *    particles and the arrival burst.
 *
 * The seat REPLACES the shipped composer model selector
 * (`conversation.input.model`, registered at priority -1), so the composer keeps
 * one control that carries both the model choice and the reasoning effort.
 *
 * This file is the module factory itself: `window.__ModuleLoader__.load({ id, factory })`
 * with the plugin id equal to the package name, React coming from the host
 * module table. CSS is injected once per document inside `apply`.
 */
window.__ModuleLoader__.load({
  id: 'dsh-effort-dial-plus',
  factory(require) {
    const React = require('react')
    const module = { exports: {} }
    const exports = module.exports

    const PLUGIN_NAME = 'effort-dial-plus'
    const STYLE_ATTR = 'data-dsh-effort-dial-plus'

    /** Codex's effort vocabulary, keyed by the adapter-owned ids DSH reports. */
    const EFFORT_LABELS = {
      none: '无',
      off: '无',
      minimal: '最低',
      low: '轻度',
      medium: '中',
      high: '高',
      xhigh: '极高',
      highest: '极高',
      max: 'Max',
      ultra: 'Ultra',
      persistent: '持续',
    }

    /** Codex prints this warning on the top level. */
    const MAX_HINT = '更快消耗使用额度'
    /** The wording shipped by earlier versions; treated as "not customised". */
    const LEGACY_HINT = '使用额度消耗更快'

    const SETTINGS_KEY = 'dsh-effort-dial-plus:settings'
    const WARNED_KEY = 'dsh-effort-dial-plus:warned'
    const CUSTOM_STYLE_ATTR = 'data-dsh-effort-dial-plus-custom'
    /** Bumped when a default changes in a way that stored values must not keep. */
    const SETTINGS_VERSION = 2

    /** Every tunable the settings page owns; the defaults are the shipped look. */
    const DEFAULT_SETTINGS = {
      // Warn on every arrival at the top level; the settings page can pin it to once.
      warnOnce: false,
      warnText: MAX_HINT,
      particles: true,
      tint: true,
      magnet: 0.18,
      width: 261,
      css: '',
    }

    /** Clamp a numeric setting into its allowed band. */
    function clampNumber(value, fallback, min, max) {
      return typeof value === 'number' && Number.isFinite(value)
        ? Math.max(min, Math.min(max, value))
        : fallback
    }

    /** Read the persisted settings, filling every missing or invalid field. */
    function loadSettings() {
      const fallback = { ...DEFAULT_SETTINGS }
      if (typeof window === 'undefined') return fallback
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY)
        if (raw === null) return fallback
        const saved = JSON.parse(raw)
        if (saved === null || typeof saved !== 'object') return fallback
        const version = typeof saved.v === 'number' ? saved.v : 0
        return {
          // v2 flipped the shipped behaviour to "warn on every arrival"; values
          // written by v1 must not keep the old "once" default.
          warnOnce: version >= SETTINGS_VERSION && typeof saved.warnOnce === 'boolean'
            ? saved.warnOnce
            : fallback.warnOnce,
          warnText: typeof saved.warnText === 'string' && saved.warnText.trim().length > 0 && saved.warnText !== LEGACY_HINT
            ? saved.warnText
            : fallback.warnText,
          particles: typeof saved.particles === 'boolean' ? saved.particles : fallback.particles,
          tint: typeof saved.tint === 'boolean' ? saved.tint : fallback.tint,
          magnet: clampNumber(saved.magnet, fallback.magnet, 0, 0.35),
          width: clampNumber(saved.width, fallback.width, 220, 360),
          css: typeof saved.css === 'string' ? saved.css : fallback.css,
        }
      } catch {
        return fallback
      }
    }

    function saveSettings(settings) {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, v: SETTINGS_VERSION }))
      } catch {
        // Private mode or a full quota: the running instance keeps the value.
      }
    }

    /** Whether the top-level quota warning was already shown on this machine. */
    function loadWarned() {
      if (typeof window === 'undefined') return false
      try {
        return window.localStorage.getItem(WARNED_KEY) === '1'
      } catch {
        return false
      }
    }

    function saveWarned() {
      if (typeof window === 'undefined') return
      try {
        window.localStorage.setItem(WARNED_KEY, '1')
      } catch {
        // noop
      }
    }

    /**
     * One settings object shared by the composer card and the DSH settings page.
     * Plain module state plus a listener set — the card and the page are separate
     * slot occupants, so they cannot share React state.
     */
    let currentSettings = loadSettings()
    const settingsListeners = new Set()

    function getSettingsSnapshot() {
      return currentSettings
    }

    function subscribeSettings(listener) {
      settingsListeners.add(listener)
      return () => {
        settingsListeners.delete(listener)
      }
    }

    function publishSettings(next) {
      currentSettings = next
      saveSettings(next)
      for (const listener of [...settingsListeners]) listener()
    }

    function patchSettings(patch) {
      publishSettings({ ...currentSettings, ...patch })
    }

    function restoreSettings() {
      try {
        window.localStorage.removeItem(WARNED_KEY)
      } catch {
        // noop
      }
      publishSettings({ ...DEFAULT_SETTINGS })
    }

    const FALLBACK_STATE = {
      current: null,
      routable: null,
      groups: [],
      failures: [],
      status: 'loading',
      error: null,
    }

    const CSS = `
.edp-trigger{display:inline-flex;align-items:center;gap:7px;height:32px;max-width:260px;padding:0 10px 0 6px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,currentColor);font:inherit;font-size:14px;line-height:1;cursor:pointer;white-space:nowrap}
.edp-trigger:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.16))}
.edp-trigger:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#0169cc);outline-offset:1px}
.edp-trigger[disabled]{cursor:default;opacity:.5}
.edp-trigger[disabled]:hover{background:none}
.edp-trigger-model{font-size:14px;font-weight:600;letter-spacing:-.1px;color:var(--dsw-alias-label-primary,currentColor);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.edp-trigger-effort{font-size:14px;font-weight:400;color:var(--dsw-alias-label-secondary,#838383);flex:0 0 auto;transition:color .34s ease}
.edp-trigger-caret{width:11px;height:11px;flex:0 0 auto;color:var(--dsw-alias-label-secondary,#838383)}

.edp-panel{position:fixed;z-index:2147483000;width:261px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1,#242424) 88%,transparent);backdrop-filter:blur(14px) saturate(1.1);-webkit-backdrop-filter:blur(14px) saturate(1.1);border-radius:14px;overflow:hidden;box-shadow:0 12px 32px rgba(0,0,0,.36),inset 0 0 0 1px var(--dsw-alias-border-l1,rgba(255,255,255,.06));font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:var(--dsw-alias-label-secondary,#b1b1b1);user-select:none;-webkit-user-select:none;transition:box-shadow .34s ease;animation:edp-panel-in .36s cubic-bezier(.19,1,.22,1) both}
.edp-panel[data-top=true]{box-shadow:0 14px 34px rgba(0,0,0,.4),inset 0 0 0 1px color-mix(in srgb,#b06dff 34%,transparent),0 0 26px color-mix(in srgb,#b06dff 15%,transparent)}
.edp-panel[data-closing=true]{animation:edp-panel-out .22s cubic-bezier(.4,0,1,1) both}
@keyframes edp-panel-in{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@keyframes edp-panel-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(12px) scale(.97)}}

.edp-body{position:relative;overflow:hidden;transition:height .36s cubic-bezier(.19,1,.22,1)}
.edp-view{width:100%;transition:opacity .2s cubic-bezier(.23,1,.32,1),translate .32s cubic-bezier(.19,1,.22,1)}
.edp-view[data-active=false]{opacity:0;pointer-events:none}
.edp-dial-view[data-active=true]{transition-delay:40ms}
.edp-dial-view[data-active=false]{translate:0 16px;transition-delay:16ms}
.edp-models-view{position:absolute;inset-block-start:0;inset-inline:0;translate:0 -16px}
.edp-models-view[data-active=true]{translate:0;transition-delay:40ms}
.edp-models-view[data-active=false]{translate:0 -16px;transition-delay:0s}

.edp-top{padding:30px 6px 0;transition:opacity .2s cubic-bezier(.23,1,.32,1),translate .32s cubic-bezier(.19,1,.22,1)}
.edp-top[data-active=true]{transition-delay:56ms}
.edp-top[data-active=false]{opacity:0;translate:0 14px;transition-delay:0s}
@keyframes edp-title-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.edp-title-row{position:relative;height:21px}
/* Absolute at the exact centre line: the heading no longer takes part in flow, so
   its glyph widths (and the letter-spacing correction on the last character) can
   never drag the visual centre off the card's middle. */
.edp-title{position:absolute;left:50%;top:50%;translate:-50% -50%;max-width:calc(100% - 56px);text-align:center;transition:color .34s ease;font-size:15px;font-weight:600;line-height:1.15;letter-spacing:-.4px;white-space:nowrap}
.edp-title-text{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;animation:edp-title-in .34s cubic-bezier(.19,1,.22,1)}
.edp-title[data-warn=true]{color:var(--dsw-alias-state-warn-primary,#d9a441)}
.edp-title[data-hint=true]{font-size:18px;font-weight:600;letter-spacing:-.4px}

.edp-glyph{position:absolute;top:50%;translate:0 -50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:0;padding:0;background:none;color:var(--dsw-alias-label-secondary,#8a8a8a);border-radius:6px;cursor:pointer;transition:background .15s ease,color .34s ease,filter .15s ease}
.edp-glyph:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.16));color:var(--dsw-alias-label-primary,#cfcfcf);filter:brightness(1.12)}
.edp-glyph:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#0169cc);outline-offset:1px}
.edp-glyph[disabled]{cursor:default;opacity:.45}
.edp-glyph[disabled]:hover{background:none;color:var(--dsw-alias-label-secondary,#8a8a8a);filter:none}
.edp-glyph svg{width:13px;height:13px;display:block}
.edp-glyph.edp-left{left:2px}
.edp-glyph.edp-right{right:2px}

.edp-model{display:flex;align-items:center;justify-content:center;gap:1px;height:14px;margin:3px 0 0;padding:0;width:100%;border:0;background:none;color:var(--dsw-alias-label-secondary,#b1b1b1);font:inherit;font-size:12px;line-height:1;cursor:pointer;transition:color .15s ease,opacity .22s ease,visibility .22s ease}
.edp-model:hover{color:var(--dsw-alias-label-primary,#d0d0d0)}
.edp-model:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#0169cc);outline-offset:2px}
.edp-model-name{letter-spacing:-.2px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.edp-model-name[data-hint=true]{color:var(--dsw-alias-label-secondary,#a9a9a9);letter-spacing:0;transition:color .34s ease}
/* Codex cross-fades the quota warning away and lets the model name settle in. */
.edp-caret{width:8px;height:8px;color:var(--dsw-alias-label-secondary,#9a9a9a);display:block;flex:0 0 auto}

.edp-zone{background:var(--dsw-alias-bg-layer-2,#272727);padding:11px 14px 10px;transition:opacity .2s cubic-bezier(.23,1,.32,1),translate .32s cubic-bezier(.19,1,.22,1)}
.edp-zone[data-active=true]{transition-delay:40ms}
.edp-zone[data-active=false]{opacity:0;translate:0 10px;transition-delay:16ms}
.edp-track{position:relative;height:30px;border-radius:15px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#fff) 14%,var(--dsw-alias-bg-layer-2,#272727));cursor:pointer;touch-action:none;outline:none}
.edp-track:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary,#0169cc) 85%,transparent)}
.edp-fill{position:absolute;left:0;top:0;bottom:0;border-radius:15px 0 0 15px;background:var(--dsw-alias-brand-primary,#0169cc);pointer-events:none;transition:width .26s cubic-bezier(.22,1.16,.36,1),background-color .34s ease}
.edp-track[data-dragging=true] .edp-fill{transition:none}
.edp-aurora{position:absolute;left:0;top:0;bottom:0;border-radius:15px 0 0 15px;overflow:hidden;pointer-events:none;opacity:0;background:linear-gradient(90deg,#6377f3 0%,#857af8 24%,#a978ff 50%,#9166f0 74%,#7350d6 100%);transition:opacity .3s ease,width .26s cubic-bezier(.22,1.16,.36,1)}
.edp-aurora[data-active=true]{opacity:1}
.edp-aurora[data-active=false] .edp-flow{animation-play-state:paused}
.edp-track[data-dragging=true] .edp-aurora{transition:none}
.edp-flow{position:absolute;inset:0;background-repeat:repeat-x;pointer-events:none;filter:brightness(1);transition:filter .18s ease-out}
.edp-flow-a{opacity:.95;background-image:radial-gradient(circle at 7% 26%,rgba(255,255,255,.92) 0 1px,transparent 1.7px),radial-gradient(circle at 23% 70%,rgba(224,212,255,.8) 0 .9px,transparent 1.5px),radial-gradient(circle at 41% 34%,rgba(255,255,255,.86) 0 1.2px,transparent 2px),radial-gradient(circle at 58% 78%,rgba(238,222,255,.72) 0 .9px,transparent 1.5px),radial-gradient(circle at 75% 22%,rgba(255,255,255,.82) 0 1.1px,transparent 1.8px),radial-gradient(circle at 91% 62%,rgba(248,240,255,.86) 0 1px,transparent 1.7px);background-size:62px 30px,78px 30px,94px 30px,70px 30px,86px 30px,108px 30px;animation:edp-flow-a 1.05s linear infinite}
.edp-flow-b{opacity:.5;background-image:radial-gradient(circle at 14% 64%,rgba(214,198,255,.75) 0 1.4px,transparent 2.1px),radial-gradient(circle at 46% 24%,rgba(255,255,255,.6) 0 1.1px,transparent 1.8px),radial-gradient(circle at 78% 72%,rgba(228,212,255,.65) 0 1.3px,transparent 2px);background-size:110px 30px,132px 30px,148px 30px;animation:edp-flow-b 2.6s linear infinite}
.edp-aurora[data-burst=true] .edp-flow{filter:brightness(1.45) saturate(1.08)}
@keyframes edp-flow-a{from{background-position:0 0,0 0,0 0,0 0,0 0,0 0}to{background-position:62px 0,78px 0,94px 0,70px 0,86px 0,108px 0}}
@keyframes edp-flow-b{from{background-position:0 0,0 0,0 0}to{background-position:110px 0,132px 0,148px 0}}

.edp-dot{position:absolute;top:50%;width:4px;height:4px;margin-top:-2px;margin-left:-2px;border-radius:50%;background:color-mix(in srgb,var(--dsw-alias-label-primary,#fff) 26%,transparent);pointer-events:none;transition:background .3s ease}
.edp-track[data-top=true] .edp-dot{background:color-mix(in srgb,var(--dsw-alias-label-primary,#fff) 34%,transparent)}
.edp-thumb{position:absolute;top:1.5px;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:#fff;box-sizing:border-box;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary,#000) 14%,transparent);pointer-events:none;box-shadow:0 1px 2px rgba(0,0,0,.24),0 2px 6px rgba(0,0,0,.16);transition:left .26s cubic-bezier(.22,1.16,.36,1)}
.edp-track[data-dragging=true] .edp-thumb{transition:none}
.edp-track:focus-visible .edp-thumb{box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-brand-primary,#0169cc) 45%,transparent)}

.edp-empty{background:var(--dsw-alias-bg-layer-2,#272727);padding:10px 16px 13px;font-size:12px;line-height:16px;color:var(--dsw-alias-label-secondary,#8a8a8a)}
.edp-empty-detail{margin-top:4px;font-size:11px;line-height:15px;color:var(--dsw-alias-state-warn-primary,#d9a441);word-break:break-word}
.edp-list{background:var(--dsw-alias-bg-layer-2,#272727);padding:6px 0 8px}
.edp-list-scroll{max-height:232px;overflow-y:auto}
.edp-list-title{padding:6px 8px 4px;font-size:13px;line-height:16px;color:var(--dsw-alias-label-secondary,#9a9a9a)}
.edp-group{margin-top:6px}
.edp-group-title{padding:2px 8px 0;font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary,#e6e6e6)}
.edp-item{display:flex;align-items:center;width:100%;border:0;background:none;color:var(--dsw-alias-label-primary,#d0d0d0);font:inherit;font-size:14px;line-height:20px;padding:5px 8px;cursor:pointer;text-align:left;gap:8px;transition:background .12s ease,color .12s ease}
.edp-item:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.edp-item[data-active=true]{color:var(--dsw-alias-label-primary,#fff)}
.edp-check{width:12px;height:12px;margin-left:auto;flex:0 0 auto;color:var(--dsw-alias-brand-primary,#0169cc)}
.edp-back{display:flex;align-items:center;gap:4px;border:0;background:none;color:var(--dsw-alias-label-secondary,#8a8a8a);font:inherit;font-size:13px;padding:6px 8px 2px;cursor:pointer;width:100%;transition:color .15s ease}
.edp-back:hover{color:var(--dsw-alias-label-primary,#cfcfcf)}

/* Settings page (rendered inside the DSH settings dialog) */
.edp-settings-card{padding:2px 0 8px}
.edp-settings-intro{margin:0 0 8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#8a8a8a)}
.edp-settings-card .edp-setting-row{padding:8px 0}
.edp-settings-card .edp-setting-stack{padding:12px 0 4px}
.edp-settings-card .edp-setting-hint{margin:4px 0 6px}
.edp-settings-card .edp-textarea{width:100%;margin:0}
.edp-settings-card .edp-settings-actions{padding:8px 0 2px}
.edp-settings-card .edp-settings-button{flex:0 0 auto;padding:5px 14px}
.edp-setting-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 12px;font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary,#d0d0d0)}
.edp-setting-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.edp-switch{position:relative;width:34px;height:20px;flex:0 0 auto;border:0;border-radius:10px;background:var(--dsw-alias-border-l2,#555);cursor:pointer;padding:0;transition:background .18s ease}
.edp-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .18s cubic-bezier(.22,1.16,.36,1);box-shadow:0 1px 2px rgba(0,0,0,.3)}
.edp-switch[aria-checked=true]{background:var(--dsw-alias-brand-primary,#0169cc)}
.edp-switch[aria-checked=true]::after{left:16px}
.edp-range{width:112px;flex:0 0 auto;accent-color:var(--dsw-alias-brand-primary,#0169cc)}
.edp-input,.edp-textarea{font:inherit;font-size:12px;line-height:16px;color:var(--dsw-alias-label-primary,#d0d0d0);background:var(--dsw-alias-bg-base,rgba(0,0,0,.18));border:1px solid var(--dsw-alias-border-l2,#444);border-radius:6px;padding:4px 6px;outline:none}
.edp-input{width:132px}
.edp-input:focus,.edp-textarea:focus{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}
.edp-setting-stack{display:block;padding:8px 12px 4px;font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary,#d0d0d0)}
.edp-textarea{display:block;width:calc(100% - 24px);margin:0 12px;min-height:74px;resize:vertical;font-family:ui-monospace,Consolas,monospace}
.edp-setting-hint{margin:4px 12px 6px;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary,#8a8a8a)}
.edp-settings-actions{display:flex;gap:8px;padding:8px 12px 2px}
.edp-settings-button{flex:1;border:1px solid var(--dsw-alias-border-l2,#444);background:none;color:var(--dsw-alias-label-primary,#d0d0d0);font:inherit;font-size:12px;line-height:18px;border-radius:6px;padding:4px 8px;cursor:pointer}
.edp-settings-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}

@media (prefers-reduced-motion: reduce){
  .edp-panel,.edp-panel[data-closing=true],.edp-title-text{animation:none}
  .edp-flow,.edp-flow-a,.edp-flow-b{animation:none}
  .edp-switch,.edp-switch::after{transition:none}
  .edp-body,.edp-view,.edp-top,.edp-zone,.edp-thumb,.edp-fill,.edp-aurora,.edp-trigger-effort,.edp-title,.edp-glyph,.edp-model,.edp-item,.edp-back,.edp-dot{transition:none}
}
`

    /** Inject the plugin stylesheet once per document; returns the element. */
    function ensureStyles() {
      if (typeof document === 'undefined') return null
      const existing = document.head.querySelector(`style[${STYLE_ATTR}]`)
      if (existing !== null) return existing
      const style = document.createElement('style')
      style.setAttribute(STYLE_ATTR, '')
      style.textContent = CSS
      document.head.appendChild(style)
      return style
    }

    /**
     * Human label for one adapter effort id, falling back to the adapter's own name.
     * @param {string} id effort id.
     * @param {{ id: string, name?: string }[]} efforts the model's effort list.
     * @returns {string} display label.
     */
    function effortLabel(id, efforts) {
      const row = efforts.find(entry => entry.id === id)
      if (row && typeof row.name === 'string' && row.name.length > 0) return row.name
      const known = EFFORT_LABELS[id]
      return known !== undefined ? known : id
    }

    /** Fallback accent when the host theme does not publish a brand color. */
    const FALLBACK_BRAND = '#0169cc'
    /** Codex's maximum-level purple, darkened a step for light surfaces. */
    const MAX_PURPLE_DARK = '#b06dff'
    const MAX_PURPLE_LIGHT = '#7d43e0'

    /** Parse `#rgb`, `#rrggbb`, `rgb()` and `rgba()` into channels, or null. */
    function parseColor(value) {
      if (typeof value !== 'string') return null
      const text = value.trim()
      const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text)
      if (hex !== null) {
        const full = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
        return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
      }
      const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text)
      if (rgb !== null) return { r: Math.round(Number(rgb[1])), g: Math.round(Number(rgb[2])), b: Math.round(Number(rgb[3])) }
      return null
    }

    /** Linear sRGB blend between two CSS colors; returns `rgb()` or the first color unchanged. */
    function mixColor(from, to, t) {
      const a = parseColor(from)
      const b = parseColor(to)
      if (a === null || b === null) return from
      const channel = (low, high) => Math.round(low + (high - low) * t)
      return `rgb(${channel(a.r, b.r)}, ${channel(a.g, b.g)}, ${channel(a.b, b.b)})`
    }

    /**
     * Read the live host palette: the brand color the composer already uses, and
     * whether the page sits on a light surface. Body ink is the reliable signal —
     * a light theme paints dark text, a dark theme paints light text.
     * @returns {{ brand: string, light: boolean }} palette.
     */
    function readPalette() {
      const fallback = { brand: FALLBACK_BRAND, light: false }
      if (typeof document === 'undefined' || document.body === null) return fallback
      const declared = getComputedStyle(document.documentElement).getPropertyValue('--dsw-alias-brand-primary').trim()
      const brand = parseColor(declared) === null ? FALLBACK_BRAND : declared
      const ink = parseColor(getComputedStyle(document.body).color)
      const light = ink === null
        ? false
        : (0.2126 * ink.r + 0.7152 * ink.g + 0.0722 * ink.b) / 255 < 0.45
      return { brand, light }
    }

    /**
     * Accent for the level the thumb sits on: the host brand color at the bottom,
     * the Codex purple at the top, interpolated so every step shift is visible.
     * @param {number} index current level index.
     * @param {number} count number of levels the model reports.
     * @param {{ brand: string, light: boolean }} palette host palette.
     * @returns {string} CSS color.
     */
    function levelAccent(index, count, palette) {
      const top = palette.light ? MAX_PURPLE_LIGHT : MAX_PURPLE_DARK
      if (count <= 1) return palette.brand
      const t = Math.max(0, Math.min(1, index / (count - 1)))
      if (t >= 0.999) return top
      return mixColor(palette.brand, top, t)
    }

    function BoltIcon() {
      return React.createElement('svg', {
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.25,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, React.createElement('path', { d: 'M8.9 1.5 3.3 8.6h3.3l-.8 5.9 5.9-7.7H8.2z' }))
    }

    function ResetIcon() {
      return React.createElement('svg', {
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.25,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
      React.createElement('path', { d: 'M13.1 8a5.1 5.1 0 1 1-1.52-3.61' }),
      React.createElement('path', { d: 'M13.3 2.4v3h-3' }))
    }

    function CaretIcon() {
      return React.createElement('svg', {
        className: 'edp-caret',
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, React.createElement('path', { d: 'm6.2 3.8 4.2 4.2-4.2 4.2' }))
    }

    function CheckIcon() {
      return React.createElement('svg', {
        className: 'edp-check',
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, React.createElement('path', { d: 'm3 8.4 3.2 3.2L13 5' }))
    }

    function CaretDownIcon() {
      return React.createElement('svg', {
        className: 'edp-trigger-caret',
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, React.createElement('path', { d: 'm4 6.2 4 4 4-4' }))
    }

    /** Resolve the current model row inside a directory snapshot. */
    function currentRow(state) {
      if (state.current === null) return undefined
      for (const group of state.groups) {
        if (group.id !== state.current.provider) continue
        for (const model of group.models) {
          if (model.id === state.current.model) return { model, group }
        }
      }
      return undefined
    }

    /**
     * The DSH settings page: one entry in the sidebar settings section that owns
     * every tunable of the composer card. Reads and writes the shared store so the
     * card updates live.
     * @returns {object} React element tree.
     */
    function SettingsCard() {
      const settings = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot)

      const switchRow = (label, key) => React.createElement('div', { className: 'edp-setting-row', key },
        React.createElement('span', { className: 'edp-setting-label' }, label),
        React.createElement('button', {
          type: 'button',
          className: 'edp-switch',
          role: 'switch',
          'aria-checked': settings[key] ? 'true' : 'false',
          'aria-label': label,
          onClick: () => patchSettings({ [key]: !settings[key] }),
        }))

      const rangeRow = (label, key, min, max, step) => React.createElement('div', { className: 'edp-setting-row', key },
        React.createElement('span', { className: 'edp-setting-label' }, label),
        React.createElement('input', {
          type: 'range',
          className: 'edp-range',
          min,
          max,
          step,
          value: settings[key],
          'aria-label': label,
          onChange: (event) => patchSettings({ [key]: Number(event.target.value) }),
        }))

      const textRow = (label, key) => React.createElement('div', { className: 'edp-setting-row', key },
        React.createElement('span', { className: 'edp-setting-label' }, label),
        React.createElement('input', {
          type: 'text',
          className: 'edp-input',
          value: settings[key],
          'aria-label': label,
          onChange: (event) => patchSettings({ [key]: event.target.value }),
        }))

      return React.createElement('div', { className: 'edp-settings-card' },
        React.createElement('div', { className: 'edp-settings-intro' }, '输入框里那张推理强度卡片的外观与交互，改完立即生效。'),
        switchRow('警告只显示一次', 'warnOnce'),
        switchRow('流动粒子', 'particles'),
        switchRow('逐档变色', 'tint'),
        rangeRow('磁吸强度', 'magnet', 0, 0.35, 0.01),
        rangeRow('面板宽度', 'width', 220, 360, 1),
        textRow('警告文案', 'warnText'),
        React.createElement('div', { className: 'edp-setting-stack' }, '高级 · 自定义 CSS'),
        React.createElement('textarea', {
          className: 'edp-textarea',
          value: settings.css,
          spellCheck: false,
          placeholder: '.edp-aurora{opacity:.8}',
          'aria-label': '自定义 CSS',
          onChange: (event) => patchSettings({ css: event.target.value }),
        }),
        React.createElement('div', { className: 'edp-setting-hint' }, '这里的规则会覆盖插件样式，例如 .edp-panel{border-radius:16px}'),
        React.createElement('div', { className: 'edp-settings-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'edp-settings-button',
            onClick: restoreSettings,
          }, '恢复默认')))
    }

    /**
     * The composer seat: replaces the shipped model selector with the fused
     * effort card. Model choice lives in the card's model row, reasoning effort
     * on the slider.
     * @param {object} props slot props (owner `locked`, standard `sessionId`) plus the bound directory resolver.
     * @returns {object} React element tree.
     */
    function Dial(props) {
      const { models, locked } = props
      const sessionId = props.sessionId ?? (props.session !== undefined && props.session !== null
        ? props.session.sessionId
        : undefined)
      const [directory, setDirectory] = React.useState(null)
      const [directoryError, setDirectoryError] = React.useState(null)

      // The session directory is not guaranteed to exist on the first render —
      // right after a Host restart, or for a session that is not retained yet,
      // `directoryFor` throws. Attach now and retry until it resolves.
      React.useEffect(() => {
        if (sessionId === undefined) {
          setDirectory(null)
          setDirectoryError(null)
          return
        }
        let cancelled = false
        let timer = 0
        let attempts = 0
        const attach = () => {
          try {
            const next = models.directoryFor(sessionId)
            if (cancelled) return
            setDirectory(next)
            setDirectoryError(null)
          } catch (error) {
            if (cancelled) return
            setDirectory(null)
            setDirectoryError(error instanceof Error ? error.message : String(error))
            attempts += 1
            // Keep retrying with backoff: a fresh session or a just-restarted Host
            // attaches its model directory once it is retained.
            timer = window.setTimeout(attach, Math.min(2000, 600 + attempts * 200))
          }
        }
        attach()
        return () => {
          cancelled = true
          if (timer !== 0) window.clearTimeout(timer)
        }
      }, [models, sessionId])

      const subscribe = React.useCallback(
        (notify) => (directory === null ? () => {} : directory.store.subscribe(notify)),
        [directory],
      )
      const read = React.useCallback(
        () => (directory === null ? FALLBACK_STATE : directory.store.getSnapshot()),
        [directory],
      )
      const state = React.useSyncExternalStore(subscribe, read)

      React.useEffect(() => {
        if (directory === null) return
        try {
          const pending = directory.load()
          if (pending !== undefined && pending !== null && typeof pending.catch === 'function') pending.catch(() => {})
        } catch (error) {
          console.error('[effort-dial-plus] directory load failed', String(error))
        }
      }, [directory])

      const [open, setOpen] = React.useState(false)
      const [closing, setClosing] = React.useState(false)
      const [pane, setPane] = React.useState('dial')
      const [dragPos, setDragPos] = React.useState(null)
      const [dragging, setDragging] = React.useState(false)
      const [pendingIndex, setPendingIndex] = React.useState(null)
      const [anchor, setAnchor] = React.useState(null)
      const [burst, setBurst] = React.useState(false)
      const [palette, setPalette] = React.useState(readPalette)
      // Settings live in a module-level store so the DSH settings page and this
      // card stay in sync while being separate slot occupants.
      const settings = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot)
      const [hintVisible, setHintVisible] = React.useState(false)
      const warnedRef = React.useRef(loadWarned())
      const hintTimer = React.useRef(0)
      const hintDoneRef = React.useRef(false)
      const widthRef = React.useRef(settings.width)
      widthRef.current = settings.width
      const triggerRef = React.useRef(null)
      const rootRef = React.useRef(null)
      const trackRef = React.useRef(null)
      const bodyRef = React.useRef(null)
      const dialViewRef = React.useRef(null)
      const modelsViewRef = React.useRef(null)
      const closeTimer = React.useRef(0)
      const dragRef = React.useRef(null)
      const trackRect = React.useRef(null)

      const row = currentRow(state)
      const reasoning = row === undefined ? undefined : row.model.reasoning
      const efforts = reasoning === undefined || !Array.isArray(reasoning.efforts) ? [] : reasoning.efforts
      const currentEffort = state.current === null ? undefined : state.current.reasoningEffort
      const effectiveEffort = currentEffort === undefined
        ? (reasoning === undefined ? undefined : reasoning.defaultEffort)
        : currentEffort
      let index = -1
      if (effectiveEffort !== undefined) {
        index = efforts.findIndex(effort => effort.id === effectiveEffort)
      }
      if (index < 0 && efforts.length > 0) index = 0
      // A fractional position while the pointer is down keeps the thumb under the
      // cursor; committing rounds it onto the adapter's level.
      const shownPos = efforts.length > 0
        ? Math.max(0, Math.min(efforts.length - 1, dragPos ?? pendingIndex ?? index))
        : 0
      const shownIndex = Math.round(shownPos)
      const ratio = efforts.length > 1 ? shownPos / (efforts.length - 1) : 0
      const title = efforts.length === 0
        ? '推理强度'
        : effortLabel(efforts[Math.max(0, shownIndex)].id, efforts)
      // Codex paints the maximum level with the theme's purple and warns about quota burn;
      // lower levels step from the host brand color so every shift stays visible.
      const isTop = efforts.length > 0 && shownIndex === efforts.length - 1
      const accent = settings.tint ? levelAccent(shownIndex, efforts.length, palette) : palette.brand
      const hintText = settings.warnText.trim().length > 0 ? settings.warnText : MAX_HINT
      // The heading flashes the quota line for a moment when the thumb lands on the
      // top level, then settles back onto the level name (Max / Ultra).
      const heading = hintVisible ? hintText : title
      const modelName = row === undefined
        ? (state.current === null ? '模型' : state.current.model)
        : row.model.name

      const close = React.useCallback((restoreFocus) => {
        if (closeTimer.current !== 0) return
        setClosing(true)
        setPane('dial')
        closeTimer.current = window.setTimeout(() => {
          closeTimer.current = 0
          setOpen(false)
          setClosing(false)
          setDragPos(null)
          setDragging(false)
          if (restoreFocus && triggerRef.current !== null) triggerRef.current.focus()
        }, 180)
      }, [])

      React.useEffect(() => () => {
        if (closeTimer.current !== 0) window.clearTimeout(closeTimer.current)
      }, [])

      React.useEffect(() => {
        if (!open) return
        const onPointerDown = (event) => {
          if (rootRef.current !== null && rootRef.current.contains(event.target)) return
          if (triggerRef.current !== null && triggerRef.current.contains(event.target)) return
          close(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close(true)
        }
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }
      }, [open, close])

      // Height animation of the two-view track (Codex animates the menu height).
      React.useLayoutEffect(() => {
        if (!open) return
        const target = pane === 'models' ? modelsViewRef.current : dialViewRef.current
        const body = bodyRef.current
        if (target === null || body === null) return
        body.style.height = `${target.scrollHeight}px`
      }, [open, pane, state.groups, state.status, efforts.length, state.error])

      // One-shot brightness burst when the thumb arrives on the top level.
      const wasTop = React.useRef(isTop)
      React.useEffect(() => {
        if (isTop && !wasTop.current) {
          setBurst(true)
          const timer = window.setTimeout(() => setBurst(false), 560)
          wasTop.current = true
          return () => window.clearTimeout(timer)
        }
        wasTop.current = isTop
        setBurst(false)
      }, [isTop])

      // Arriving at the top level flashes the quota line in the heading for ~1.2s,
      // then the heading settles back onto the level name. `hintDoneRef` marks the
      // current top-level stay so the effect cannot restart itself when the timer
      // fires, and a panel remount never restarts it either.
      React.useEffect(() => {
        if (!isTop) {
          if (hintTimer.current !== 0) {
            window.clearTimeout(hintTimer.current)
            hintTimer.current = 0
          }
          hintDoneRef.current = false
          if (hintVisible) setHintVisible(false)
          return
        }
        if (hintDoneRef.current) return
        const allowed = !settings.warnOnce || !warnedRef.current
        if (!allowed) return
        if (settings.warnOnce && !warnedRef.current) {
          warnedRef.current = true
          saveWarned()
        }
        hintDoneRef.current = true
        setHintVisible(true)
        hintTimer.current = window.setTimeout(() => {
          hintTimer.current = 0
          setHintVisible(false)
        }, 2200)
      }, [isTop, hintVisible, settings.warnOnce])

      React.useEffect(() => () => {
        if (hintTimer.current !== 0) window.clearTimeout(hintTimer.current)
      }, [])

      // Custom CSS from the settings page: one owned style element, replaced on every
      // edit and removed with the component.
      React.useEffect(() => {
        if (typeof document === 'undefined') return
        let tag = document.head.querySelector(`style[${CUSTOM_STYLE_ATTR}]`)
        if (tag === null) {
          tag = document.createElement('style')
          tag.setAttribute(CUSTOM_STYLE_ATTR, '')
        }
        tag.textContent = settings.css
        // Always last so user rules win over the plugin stylesheet.
        document.head.appendChild(tag)
        return () => {
          if (tag !== null && tag.parentNode !== null) tag.parentNode.removeChild(tag)
        }
      }, [settings.css])

      // The panel is fixed to the viewport, so it must be re-anchored whenever the
      // window resizes (full screen, sidebar collapse) or the composer scrolls.
      const measureAnchor = () => {
        const rect = triggerRef.current === null ? null : triggerRef.current.getBoundingClientRect()
        if (rect === null) return
        const width = widthRef.current
        const left = Math.min(Math.max(8, rect.right - width), Math.max(8, window.innerWidth - width - 8))
        const bottom = Math.max(8, window.innerHeight - rect.top + 6)
        setAnchor(prev => (prev !== null && prev.left === left && prev.bottom === bottom ? prev : { left, bottom }))
      }

      // While the panel is open, follow the trigger: window resize (full screen),
      // scrolling, and layout shifts such as collapsing the sidebar all move it.
      React.useEffect(() => {
        if (!open) return
        let frame = 0
        let lastKey = ''
        const tick = () => {
          frame = window.requestAnimationFrame(tick)
          const rect = triggerRef.current === null ? null : triggerRef.current.getBoundingClientRect()
          if (rect === null) return
          const key = `${Math.round(rect.top)}:${Math.round(rect.right)}:${window.innerWidth}:${window.innerHeight}:${widthRef.current}`
          if (key === lastKey) return
          lastKey = key
          measureAnchor()
        }
        frame = window.requestAnimationFrame(tick)
        return () => {
          if (frame !== 0) window.cancelAnimationFrame(frame)
        }
      }, [open])

      const openPanel = () => {
        measureAnchor()
        setPalette(readPalette())
        setPane('dial')
        setDragPos(null)
        setDragging(false)
        setOpen(true)
        if (directory !== null) {
          try {
            const pending = directory.load()
            if (pending !== undefined && pending !== null && typeof pending.catch === 'function') pending.catch(() => {})
          } catch (error) {
            console.error('[effort-dial-plus] directory load failed', String(error))
          }
        }
      }

      // `select` may throw synchronously when the directory is not connected yet;
      // never let that escape an event handler.
      const selectSafe = (selection) => {
        if (directory === null) return
        try {
          const pending = directory.select(selection)
          if (pending !== undefined && pending !== null && typeof pending.catch === 'function') {
            pending.catch((error) => { console.error('[effort-dial-plus]', error) })
          }
        } catch (error) {
          console.error('[effort-dial-plus]', error)
        }
      }

      const commit = (nextIndex) => {
        if (directory === null || state.current === null) return
        if (nextIndex < 0 || nextIndex >= efforts.length) return
        const target = efforts[nextIndex]
        if (target.id === effectiveEffort) return
        // Optimistic position so the thumb slides to the picked level while the
        // request is in flight; the durable projection lands right after. Only the
        // request that set this position may clear it.
        setPendingIndex(nextIndex)
        try {
          const pending = directory.select({
            provider: state.current.provider,
            model: state.current.model,
            reasoningEffort: target.id,
          })
          if (pending !== undefined && pending !== null && typeof pending.catch === 'function') {
            pending
              .catch((error) => { console.error('[effort-dial-plus]', error) })
              .finally(() => { setPendingIndex(current => (current === nextIndex ? null : current)) })
          } else {
            setPendingIndex(null)
          }
        } catch (error) {
          console.error('[effort-dial-plus]', error)
          setPendingIndex(null)
        }
      }

      const reset = () => {
        if (directory === null || state.current === null || reasoning === undefined) return
        const selection = { provider: state.current.provider, model: state.current.model }
        if (reasoning.defaultEffort !== undefined) selection.reasoningEffort = reasoning.defaultEffort
        selectSafe(selection)
      }

      // Fractional level position under one client X coordinate (0 … count-1).
      // The track rect is cached for the duration of a drag: reading it on every
      // pointermove would force a layout after each style write.
      const posAt = (clientX) => {
        const el = trackRef.current
        if (el === null || efforts.length < 2) return 0
        const rect = trackRect.current ?? el.getBoundingClientRect()
        const radius = 14
        const span = Math.max(1, rect.width - radius * 2)
        const ratioAt = Math.max(0, Math.min(1, (clientX - rect.left - radius) / span))
        return ratioAt * (efforts.length - 1)
      }

      // Snap only inside the configured band so the thumb can still rest on a level.
      const magnetize = (position) => {
        const band = settings.magnet
        if (band <= 0) return position
        const nearest = Math.round(position)
        return Math.abs(position - nearest) <= band ? nearest : position
      }

      const onPointerDown = (event) => {
        if (efforts.length < 2) return
        event.preventDefault()
        dragRef.current = { startX: event.clientX, moved: false }
        const el = trackRef.current
        if (el !== null) {
          trackRect.current = el.getBoundingClientRect()
          el.focus({ preventScroll: true })
        }
        if (el !== null && typeof el.setPointerCapture === 'function') {
          try { el.setPointerCapture(event.pointerId) } catch { /* noop */ }
        }
        // Preview on press so a plain click slides there instead of jumping on release.
        setDragPos(magnetize(posAt(event.clientX)))
      }

      const onPointerMove = (event) => {
        const drag = dragRef.current
        if (drag === null || efforts.length < 2) return
        // A click keeps the thumb transition; only a real drag drops it.
        if (!drag.moved) {
          if (Math.abs(event.clientX - drag.startX) < 2) return
          drag.moved = true
          setDragging(true)
        }
        setDragPos(magnetize(posAt(event.clientX)))
      }

      const onPointerUp = (event) => {
        const drag = dragRef.current
        if (drag === null) return
        dragRef.current = null
        const position = magnetize(posAt(event.clientX))
        trackRect.current = null
        setDragPos(null)
        setDragging(false)
        commit(Math.round(position))
      }

      const onPointerCancel = () => {
        dragRef.current = null
        trackRect.current = null
        setDragPos(null)
        setDragging(false)
      }

      const onTrackKeyDown = (event) => {
        if (efforts.length < 2) return
        const from = Math.round(shownPos)
        let next = null
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(efforts.length - 1, from + 1)
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, from - 1)
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = efforts.length - 1
        if (next === null) return
        event.preventDefault()
        commit(next)
      }

      const chooseModel = (group, model) => {
        if (directory === null) return
        const selection = { provider: group.id, model: model.id }
        const defaultEffort = model.reasoning === undefined ? undefined : model.reasoning.defaultEffort
        if (defaultEffort !== undefined) selection.reasoningEffort = defaultEffort
        setPane('dial')
        selectSafe(selection)
      }

      const fillWidth = `calc(14px + (100% - 28px) * ${ratio})`

      const trigger = React.createElement('button', {
        ref: triggerRef,
        type: 'button',
        className: 'edp-trigger',
        'aria-label': `模型与推理强度：${modelName}${efforts.length === 0 ? '' : ` · ${title}`}`,
        'aria-haspopup': 'dialog',
        'aria-expanded': open,
        disabled: locked === true,
        onClick: () => { if (open) close(true); else openPanel() },
      },
      React.createElement('span', { className: 'edp-trigger-model' }, modelName),
      efforts.length > 0 ? React.createElement('span', {
        className: 'edp-trigger-effort',
        style: { color: accent },
      }, title) : null,
      React.createElement(CaretDownIcon))

      if (!open && !closing) return trigger

      const top = React.createElement('div', {
        className: 'edp-top',
        'data-active': pane === 'dial' ? 'true' : 'false',
      },
      React.createElement('div', { className: 'edp-title-row' },
        React.createElement('button', {
          type: 'button',
          className: 'edp-glyph edp-left',
          tabIndex: -1,
          'aria-hidden': 'true',
          style: { color: accent },
        }, React.createElement(BoltIcon)),
        React.createElement('span', {
          className: 'edp-title',
          // An inline color would beat the `data-warn` severity color, so the
          // accent is only applied when the model actually reports levels.
          style: efforts.length === 0 ? undefined : { color: accent },
          'data-warn': efforts.length === 0 ? 'true' : 'false',
          'data-hint': hintVisible ? 'true' : 'false',
        }, React.createElement('span', { key: heading, className: 'edp-title-text' }, heading)),
        React.createElement('button', {
          type: 'button',
          className: 'edp-glyph edp-right',
          'aria-label': '恢复默认推理强度',
          disabled: efforts.length === 0 || index < 0 || (reasoning !== undefined && effectiveEffort === reasoning.defaultEffort),
          onClick: reset,
        }, React.createElement(ResetIcon))),
      // The model row keeps its space while the quota line is up: only its ink is
      // hidden, so the card never changes height.
      React.createElement('button', {
        type: 'button',
        className: 'edp-model',
        'aria-label': `选择模型（当前 ${modelName}）`,
        'aria-hidden': hintVisible ? 'true' : undefined,
        style: hintVisible ? { opacity: 0, visibility: 'hidden' } : undefined,
        onClick: () => setPane(pane === 'models' ? 'dial' : 'models'),
      },
      React.createElement('span', {
        className: 'edp-model-name',
        'data-hint': isTop ? 'true' : 'false',
      }, modelName),
      React.createElement(CaretIcon)))

      let dialBody
      if (efforts.length === 0) {
        let emptyText
        if (directory === null) {
          emptyText = directoryError === null ? '正在读取模型目录…' : '模型目录暂不可用，正在重试…'
        } else if (state.status === 'loading') {
          emptyText = '正在加载模型能力…'
        } else if (state.error !== null) {
          emptyText = `模型目录加载失败：${state.error}`
        } else {
          emptyText = '当前模型不支持推理强度档位'
        }
        const detail = directory === null && directoryError !== null
          ? React.createElement('div', { className: 'edp-empty-detail' },
            directoryError,
            sessionId === undefined ? ' · 未拿到会话 ID' : '')
          : null
        dialBody = React.createElement('div', { className: 'edp-empty', 'data-status': state.status }, emptyText, detail)
      } else {
        const dots = efforts.map((effort, i) => React.createElement('span', {
          key: effort.id,
          className: 'edp-dot',
          style: { left: `calc(14px + (100% - 28px) * ${efforts.length > 1 ? i / (efforts.length - 1) : 0})` },
        }))
        dialBody = React.createElement('div', {
          className: 'edp-zone',
          'data-active': pane === 'dial' ? 'true' : 'false',
        }, React.createElement('div', {
          ref: trackRef,
          className: 'edp-track',
          role: 'slider',
          tabIndex: pane === 'dial' ? 0 : -1,
          'aria-valuemin': 0,
          'aria-valuemax': efforts.length - 1,
          'aria-valuenow': Math.max(0, shownIndex),
          'aria-valuetext': title,
          'aria-label': '推理强度',
          'data-dragging': dragging ? 'true' : 'false',
          'data-top': isTop ? 'true' : 'false',
          onPointerDown,
          onPointerMove,
          onPointerUp,
          onPointerCancel,
          onKeyDown: onTrackKeyDown,
        },
        React.createElement('div', {
          className: 'edp-fill',
          style: { width: fillWidth, background: accent },
        }),
        React.createElement('div', {
          className: 'edp-aurora',
          'data-active': isTop ? 'true' : 'false',
          'data-burst': burst ? 'true' : 'false',
          style: { width: fillWidth },
        },
        settings.particles
          ? [
            React.createElement('div', { key: 'flow-a', className: 'edp-flow edp-flow-a' }),
            React.createElement('div', { key: 'flow-b', className: 'edp-flow edp-flow-b' }),
          ]
          : null),
        dots,
        React.createElement('div', {
          className: 'edp-thumb',
          style: { left: fillWidth },
        })))
      }

      const modelsView = React.createElement('div', {
        ref: modelsViewRef,
        className: 'edp-view edp-models-view',
        'data-active': pane === 'models' ? 'true' : 'false',
      },
      React.createElement('div', { className: 'edp-list' },
        React.createElement('button', {
          type: 'button',
          className: 'edp-back',
          onClick: () => setPane('dial'),
        }, React.createElement('span', { 'aria-hidden': 'true' }, '←'), React.createElement('span', null, '返回')),
        React.createElement('div', { className: 'edp-list-title' }, '选择模型'),
        React.createElement('div', { className: 'edp-list-scroll', role: 'menu' },
          state.groups.map((group) => React.createElement('div', { className: 'edp-group', key: group.id },
            React.createElement('div', { className: 'edp-group-title' }, group.name),
            group.models.map((model) => {
              const active = state.current !== null
                && state.current.provider === group.id
                && state.current.model === model.id
              return React.createElement('button', {
                key: model.id,
                type: 'button',
                role: 'menuitemradio',
                'aria-checked': active,
                className: 'edp-item',
                'data-active': active ? 'true' : 'false',
                onClick: () => chooseModel(group, model),
              },
              React.createElement('span', { className: 'edp-model-name' }, model.name),
              active ? React.createElement(CheckIcon) : null)
            }))))))



      const dialView = React.createElement('div', {
        ref: dialViewRef,
        className: 'edp-view edp-dial-view',
        'data-active': pane === 'dial' ? 'true' : 'false',
      }, top, dialBody)

      const panel = React.createElement('div', {
        ref: rootRef,
        className: 'edp-panel',
        role: 'dialog',
        'aria-label': '模型与推理强度',
        'data-closing': closing ? 'true' : 'false',
        'data-top': isTop ? 'true' : 'false',
        style: anchor === null
          ? { visibility: 'hidden', width: `${settings.width}px` }
          : { left: `${anchor.left}px`, bottom: `${anchor.bottom}px`, width: `${settings.width}px` },
      },
      React.createElement('div', { className: 'edp-body', ref: bodyRef }, dialView, modelsView))

      return React.createElement(React.Fragment, null, trigger, panel)
    }

    exports.name = PLUGIN_NAME
    // The model directory reaches the session through `remote.session`; a context
    // without that inject throws `cannot get property "remote.session" without
    // inject` on the first directory lookup after a Host restart.
    exports.inject = ['slots', 'modelDirectories', 'remote.session']
    exports.apply = function apply(ctx) {
      ctx.effect(() => {
        const style = ensureStyles()
        return () => {
          if (style !== null && style.parentNode !== null) style.parentNode.removeChild(style)
        }
      }, 'effort-dial-plus: styles')

      ctx.inject(['slots', 'modelDirectories', 'remote.session'], (scope) => {
        const models = scope.modelDirectories ?? scope.get('models')
        // Priority -1 shadows the shipped occupant of this single seat: the
        // composer keeps one control, and it is this one.
        scope.slots.inject('conversation.input.model', () => scope.slots.register({
          name: 'conversation.input.model',
          priority: -1,
        }, (props) => React.createElement(Dial, Object.assign({}, props, { models }))))
      })

      // One page of its own in the DSH settings dialog.
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'effort-dial-plus',
        order: 120,
        label: () => '推理强度拨盘',
      }, SettingsCard))
    }

    return module.exports
  },
})
