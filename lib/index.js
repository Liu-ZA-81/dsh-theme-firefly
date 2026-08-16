/**
 * dsh-theme-firefly —— 服务端占位。
 * 主题的全部逻辑在浏览器端（lib/client.js）；空 apply 让 cordis.patch.yml
 * 里的 loader 行可以挂载（没有 fiber 的行会导致 boot 扫描失败）。
 */
export function apply() {}
