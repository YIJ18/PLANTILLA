var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// plugins/visual-editor/vite-plugin-react-inline-editor.js
var vite_plugin_react_inline_editor_exports = {};
__export(vite_plugin_react_inline_editor_exports, {
  default: () => inlineEditPlugin
});
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/node_modules/@babel/parser/lib/index.js";
import traverseBabel from "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/node_modules/@babel/traverse/lib/index.js";
import generate from "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/node_modules/@babel/types/lib/index.js";
import fs from "fs";
function parseEditId(editId) {
  const parts = editId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.at(-1), 10);
  const line = parseInt(parts.at(-2), 10);
  const filePath = parts.slice(0, -2).join(":");
  if (!filePath || isNaN(line) || isNaN(column)) {
    return null;
  }
  return { filePath, line, column };
}
function checkTagNameEditable(openingElementNode, editableTagsList) {
  if (!openingElementNode || !openingElementNode.name)
    return false;
  const nameNode = openingElementNode.name;
  if (nameNode.type === "JSXIdentifier" && editableTagsList.includes(nameNode.name)) {
    return true;
  }
  if (nameNode.type === "JSXMemberExpression" && nameNode.property && nameNode.property.type === "JSXIdentifier" && editableTagsList.includes(nameNode.property.name)) {
    return true;
  }
  return false;
}
function inlineEditPlugin() {
  return {
    name: "vite-inline-edit-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id) || !id.startsWith(VITE_PROJECT_ROOT) || id.includes("node_modules")) {
        return null;
      }
      const relativeFilePath = path.relative(VITE_PROJECT_ROOT, id);
      const webRelativeFilePath = relativeFilePath.split(path.sep).join("/");
      try {
        const babelAst = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          errorRecovery: true
        });
        let attributesAdded = 0;
        traverseBabel.default(babelAst, {
          enter(path3) {
            if (path3.isJSXOpeningElement()) {
              const openingNode = path3.node;
              const elementNode = path3.parentPath.node;
              if (!openingNode.loc) {
                return;
              }
              const alreadyHasId = openingNode.attributes.some(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-edit-id"
              );
              if (alreadyHasId) {
                return;
              }
              const isCurrentElementEditable = checkTagNameEditable(openingNode, EDITABLE_HTML_TAGS);
              if (!isCurrentElementEditable) {
                return;
              }
              let shouldBeDisabledDueToChildren = false;
              if (t.isJSXElement(elementNode) && elementNode.children) {
                const hasPropsSpread = openingNode.attributes.some(
                  (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
                );
                const hasDynamicChild = elementNode.children.some(
                  (child) => t.isJSXExpressionContainer(child)
                );
                if (hasDynamicChild || hasPropsSpread) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (!shouldBeDisabledDueToChildren && t.isJSXElement(elementNode) && elementNode.children) {
                const hasEditableJsxChild = elementNode.children.some((child) => {
                  if (t.isJSXElement(child)) {
                    return checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS);
                  }
                  return false;
                });
                if (hasEditableJsxChild) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (shouldBeDisabledDueToChildren) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              if (t.isJSXElement(elementNode) && elementNode.children && elementNode.children.length > 0) {
                let hasNonEditableJsxChild = false;
                for (const child of elementNode.children) {
                  if (t.isJSXElement(child)) {
                    if (!checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS)) {
                      hasNonEditableJsxChild = true;
                      break;
                    }
                  }
                }
                if (hasNonEditableJsxChild) {
                  const disabledAttribute = t.jsxAttribute(
                    t.jsxIdentifier("data-edit-disabled"),
                    t.stringLiteral("true")
                  );
                  openingNode.attributes.push(disabledAttribute);
                  attributesAdded++;
                  return;
                }
              }
              let currentAncestorCandidatePath = path3.parentPath.parentPath;
              while (currentAncestorCandidatePath) {
                const ancestorJsxElementPath = currentAncestorCandidatePath.isJSXElement() ? currentAncestorCandidatePath : currentAncestorCandidatePath.findParent((p) => p.isJSXElement());
                if (!ancestorJsxElementPath) {
                  break;
                }
                if (checkTagNameEditable(ancestorJsxElementPath.node.openingElement, EDITABLE_HTML_TAGS)) {
                  return;
                }
                currentAncestorCandidatePath = ancestorJsxElementPath.parentPath;
              }
              const line = openingNode.loc.start.line;
              const column = openingNode.loc.start.column + 1;
              const editId = `${webRelativeFilePath}:${line}:${column}`;
              const idAttribute = t.jsxAttribute(
                t.jsxIdentifier("data-edit-id"),
                t.stringLiteral(editId)
              );
              openingNode.attributes.push(idAttribute);
              attributesAdded++;
            }
          }
        });
        if (attributesAdded > 0) {
          const generateFunction = generate.default || generate;
          const output = generateFunction(babelAst, {
            sourceMaps: true,
            sourceFileName: webRelativeFilePath
          }, code);
          return { code: output.code, map: output.map };
        }
        return null;
      } catch (error) {
        console.error(`[vite][visual-editor] Error transforming ${id}:`, error);
        return null;
      }
    },
    // Updates source code based on the changes received from the client
    configureServer(server) {
      server.middlewares.use("/api/apply-edit", async (req, res, next) => {
        if (req.method !== "POST")
          return next();
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          var _a;
          let absoluteFilePath = "";
          try {
            const { editId, newFullText } = JSON.parse(body);
            if (!editId || typeof newFullText === "undefined") {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Missing editId or newFullText" }));
            }
            const parsedId = parseEditId(editId);
            if (!parsedId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid editId format (filePath:line:column)" }));
            }
            const { filePath, line, column } = parsedId;
            absoluteFilePath = path.resolve(VITE_PROJECT_ROOT, filePath);
            if (filePath.includes("..") || !absoluteFilePath.startsWith(VITE_PROJECT_ROOT) || absoluteFilePath.includes("node_modules")) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid path" }));
            }
            const originalContent = fs.readFileSync(absoluteFilePath, "utf-8");
            const babelAst = parse(originalContent, {
              sourceType: "module",
              plugins: ["jsx", "typescript"],
              errorRecovery: true
            });
            let targetNodePath = null;
            const visitor = {
              JSXOpeningElement(path3) {
                const node = path3.node;
                if (node.loc && node.loc.start.line === line && node.loc.start.column + 1 === column) {
                  targetNodePath = path3;
                  path3.stop();
                }
              }
            };
            traverseBabel.default(babelAst, visitor);
            if (!targetNodePath) {
              res.writeHead(404, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Target node not found by line/column", editId }));
            }
            const generateFunction = generate.default || generate;
            const parentElementNode = (_a = targetNodePath.parentPath) == null ? void 0 : _a.node;
            let beforeCode = "";
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              const beforeOutput = generateFunction(parentElementNode, {});
              beforeCode = beforeOutput.code;
            }
            let modified = false;
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              parentElementNode.children = [];
              if (newFullText && newFullText.trim() !== "") {
                const newTextNode = t.jsxText(newFullText);
                parentElementNode.children.push(newTextNode);
              }
              modified = true;
            }
            if (!modified) {
              res.writeHead(409, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Could not apply changes to AST." }));
            }
            let afterCode = "";
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              const afterOutput = generateFunction(parentElementNode, {});
              afterCode = afterOutput.code;
            }
            const output = generateFunction(babelAst, {});
            const newContent = output.code;
            try {
              fs.writeFileSync(absoluteFilePath, newContent, "utf-8");
            } catch (writeError) {
              console.error(`[vite][visual-editor] Error during direct write for ${filePath}:`, writeError);
              throw writeError;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              newFileContent: newContent,
              beforeCode,
              afterCode
            }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error during edit application." }));
          }
        });
      });
    }
  };
}
var __vite_injected_original_import_meta_url, __filename, __dirname2, VITE_PROJECT_ROOT, EDITABLE_HTML_TAGS;
var init_vite_plugin_react_inline_editor = __esm({
  "plugins/visual-editor/vite-plugin-react-inline-editor.js"() {
    __vite_injected_original_import_meta_url = "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/plugins/visual-editor/vite-plugin-react-inline-editor.js";
    __filename = fileURLToPath(__vite_injected_original_import_meta_url);
    __dirname2 = path.dirname(__filename);
    VITE_PROJECT_ROOT = path.resolve(__dirname2, "../..");
    EDITABLE_HTML_TAGS = ["a", "Button", "button", "p", "span", "h1", "h2", "h3", "h4"];
  }
});

// plugins/visual-editor/visual-editor-config.js
var EDIT_MODE_STYLES;
var init_visual_editor_config = __esm({
  "plugins/visual-editor/visual-editor-config.js"() {
    EDIT_MODE_STYLES = `
  #root[data-edit-mode-enabled="true"] [data-edit-id] {
    cursor: pointer; 
    outline: 1px dashed #357DF9; 
    outline-offset: 2px;
    min-height: 1em;
  }
  #root[data-edit-mode-enabled="true"] {
    cursor: pointer;
  }
  #root[data-edit-mode-enabled="true"] [data-edit-id]:hover {
    background-color: #357DF933;
    outline-color: #357DF9; 
  }

  @keyframes fadeInTooltip {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  #inline-editor-disabled-tooltip {
    display: none; 
    opacity: 0; 
    position: absolute;
    background-color: #1D1E20;
    color: white;
    padding: 4px 8px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 14px;
    border: 1px solid #3B3D4A;
    max-width: 184px;
    text-align: center;
  }

  #inline-editor-disabled-tooltip.tooltip-active {
    display: block;
    animation: fadeInTooltip 0.2s ease-out forwards;
  }
`;
  }
});

// plugins/visual-editor/vite-plugin-edit-mode.js
var vite_plugin_edit_mode_exports = {};
__export(vite_plugin_edit_mode_exports, {
  default: () => inlineEditDevPlugin
});
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
function inlineEditDevPlugin() {
  return {
    name: "vite:inline-edit-dev",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve(__dirname3, "edit-mode-script.js");
      const scriptContent = readFileSync(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        },
        {
          tag: "style",
          children: EDIT_MODE_STYLES,
          injectTo: "head"
        }
      ];
    }
  };
}
var __vite_injected_original_import_meta_url2, __filename2, __dirname3;
var init_vite_plugin_edit_mode = __esm({
  "plugins/visual-editor/vite-plugin-edit-mode.js"() {
    init_visual_editor_config();
    __vite_injected_original_import_meta_url2 = "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/plugins/visual-editor/vite-plugin-edit-mode.js";
    __filename2 = fileURLToPath2(__vite_injected_original_import_meta_url2);
    __dirname3 = resolve(__filename2, "..");
  }
});

// vite.config.js
import path2 from "node:path";
import react from "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { createLogger, defineConfig } from "file:///C:/Users/danym/OneDrive%20-%20Universidad%20Iberoamericana%20A.C.%20ACAD/Uni/Astra/Website/Oficial-Principal/PLANTILLA/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "C:\\Users\\danym\\OneDrive - Universidad Iberoamericana A.C. ACAD\\Uni\\Astra\\Website\\Oficial-Principal\\PLANTILLA";
var isDev = process.env.NODE_ENV !== "production";
var inlineEditPlugin2;
var editModeDevPlugin;
if (isDev) {
  inlineEditPlugin2 = (await Promise.resolve().then(() => (init_vite_plugin_react_inline_editor(), vite_plugin_react_inline_editor_exports))).default;
  editModeDevPlugin = (await Promise.resolve().then(() => (init_vite_plugin_edit_mode(), vite_plugin_edit_mode_exports))).default;
}
var configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;
var configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;
var configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;
var configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsRuntimeErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsViteErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsConsoleErrroHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configWindowFetchMonkeyPatch,
          injectTo: "head"
        }
      ]
    };
  }
};
console.warn = () => {
};
var logger = createLogger();
var loggerError = logger.error;
logger.error = (msg, options) => {
  var _a;
  if ((_a = options == null ? void 0 : options.error) == null ? void 0 : _a.toString().includes("CssSyntaxError: [postcss]")) {
    return;
  }
  loggerError(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  plugins: [
    ...isDev ? [inlineEditPlugin2(), editModeDevPlugin()] : [],
    react(),
    addTransformIndexHtml
  ],
  server: {
    cors: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true
  },
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path2.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      external: [
        "@babel/parser",
        "@babel/traverse",
        "@babel/generator",
        "@babel/types"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3Zpc3VhbC1lZGl0b3ItY29uZmlnLmpzIiwgInBsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1lZGl0LW1vZGUuanMiLCAidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYW55bVxcXFxPbmVEcml2ZSAtIFVuaXZlcnNpZGFkIEliZXJvYW1lcmljYW5hIEEuQy4gQUNBRFxcXFxVbmlcXFxcQXN0cmFcXFxcV2Vic2l0ZVxcXFxPZmljaWFsLVByaW5jaXBhbFxcXFxQTEFOVElMTEFcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYW55bVxcXFxPbmVEcml2ZSAtIFVuaXZlcnNpZGFkIEliZXJvYW1lcmljYW5hIEEuQy4gQUNBRFxcXFxVbmlcXFxcQXN0cmFcXFxcV2Vic2l0ZVxcXFxPZmljaWFsLVByaW5jaXBhbFxcXFxQTEFOVElMTEFcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXFxcXHZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RhbnltL09uZURyaXZlJTIwLSUyMFVuaXZlcnNpZGFkJTIwSWJlcm9hbWVyaWNhbmElMjBBLkMuJTIwQUNBRC9VbmkvQXN0cmEvV2Vic2l0ZS9PZmljaWFsLVByaW5jaXBhbC9QTEFOVElMTEEvcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCc7XHJcbmltcG9ydCB7IHBhcnNlIH0gZnJvbSAnQGJhYmVsL3BhcnNlcic7XHJcbmltcG9ydCB0cmF2ZXJzZUJhYmVsIGZyb20gJ0BiYWJlbC90cmF2ZXJzZSc7XHJcbmltcG9ydCBnZW5lcmF0ZSBmcm9tICdAYmFiZWwvZ2VuZXJhdG9yJztcclxuaW1wb3J0ICogYXMgdCBmcm9tICdAYmFiZWwvdHlwZXMnO1xyXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xyXG5cclxuY29uc3QgX19maWxlbmFtZSA9IGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKTtcclxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xyXG5jb25zdCBWSVRFX1BST0pFQ1RfUk9PVCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpO1xyXG5jb25zdCBFRElUQUJMRV9IVE1MX1RBR1MgPSBbXCJhXCIsIFwiQnV0dG9uXCIsIFwiYnV0dG9uXCIsIFwicFwiLCBcInNwYW5cIiwgXCJoMVwiLCBcImgyXCIsIFwiaDNcIiwgXCJoNFwiXTtcclxuXHJcbmZ1bmN0aW9uIHBhcnNlRWRpdElkKGVkaXRJZCkge1xyXG4gIGNvbnN0IHBhcnRzID0gZWRpdElkLnNwbGl0KCc6Jyk7XHJcblxyXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAzKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIGNvbnN0IGNvbHVtbiA9IHBhcnNlSW50KHBhcnRzLmF0KC0xKSwgMTApO1xyXG4gIGNvbnN0IGxpbmUgPSBwYXJzZUludChwYXJ0cy5hdCgtMiksIDEwKTtcclxuICBjb25zdCBmaWxlUGF0aCA9IHBhcnRzLnNsaWNlKDAsIC0yKS5qb2luKCc6Jyk7XHJcblxyXG4gIGlmICghZmlsZVBhdGggfHwgaXNOYU4obGluZSkgfHwgaXNOYU4oY29sdW1uKSkge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hlY2tUYWdOYW1lRWRpdGFibGUob3BlbmluZ0VsZW1lbnROb2RlLCBlZGl0YWJsZVRhZ3NMaXN0KSB7XHJcbiAgICBpZiAoIW9wZW5pbmdFbGVtZW50Tm9kZSB8fCAhb3BlbmluZ0VsZW1lbnROb2RlLm5hbWUpIHJldHVybiBmYWxzZTtcclxuICAgIGNvbnN0IG5hbWVOb2RlID0gb3BlbmluZ0VsZW1lbnROb2RlLm5hbWU7XHJcblxyXG4gICAgLy8gQ2hlY2sgMTogRGlyZWN0IG5hbWUgKGZvciA8cD4sIDxCdXR0b24+KVxyXG4gICAgaWYgKG5hbWVOb2RlLnR5cGUgPT09ICdKU1hJZGVudGlmaWVyJyAmJiBlZGl0YWJsZVRhZ3NMaXN0LmluY2x1ZGVzKG5hbWVOb2RlLm5hbWUpKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgMjogUHJvcGVydHkgbmFtZSBvZiBhIG1lbWJlciBleHByZXNzaW9uIChmb3IgPG1vdGlvbi5oMT4sIGNoZWNrIGlmIFwiaDFcIiBpcyBpbiBlZGl0YWJsZVRhZ3NMaXN0KVxyXG4gICAgaWYgKG5hbWVOb2RlLnR5cGUgPT09ICdKU1hNZW1iZXJFeHByZXNzaW9uJyAmJiBuYW1lTm9kZS5wcm9wZXJ0eSAmJiBuYW1lTm9kZS5wcm9wZXJ0eS50eXBlID09PSAnSlNYSWRlbnRpZmllcicgJiYgZWRpdGFibGVUYWdzTGlzdC5pbmNsdWRlcyhuYW1lTm9kZS5wcm9wZXJ0eS5uYW1lKSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdFBsdWdpbigpIHsgIFxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAndml0ZS1pbmxpbmUtZWRpdC1wbHVnaW4nLFxyXG4gICAgZW5mb3JjZTogJ3ByZScsXHJcblxyXG4gICAgdHJhbnNmb3JtKGNvZGUsIGlkKSB7XHJcbiAgICAgIGlmICghL1xcLihqc3h8dHN4KSQvLnRlc3QoaWQpIHx8ICFpZC5zdGFydHNXaXRoKFZJVEVfUFJPSkVDVF9ST09UKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcmVsYXRpdmVGaWxlUGF0aCA9IHBhdGgucmVsYXRpdmUoVklURV9QUk9KRUNUX1JPT1QsIGlkKTtcclxuICAgICAgY29uc3Qgd2ViUmVsYXRpdmVGaWxlUGF0aCA9IHJlbGF0aXZlRmlsZVBhdGguc3BsaXQocGF0aC5zZXApLmpvaW4oJy8nKTtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgYmFiZWxBc3QgPSBwYXJzZShjb2RlLCB7XHJcbiAgICAgICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcclxuICAgICAgICAgIHBsdWdpbnM6IFsnanN4JywgJ3R5cGVzY3JpcHQnXSxcclxuICAgICAgICAgIGVycm9yUmVjb3Zlcnk6IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGV0IGF0dHJpYnV0ZXNBZGRlZCA9IDA7XHJcblxyXG4gICAgICAgIHRyYXZlcnNlQmFiZWwuZGVmYXVsdChiYWJlbEFzdCwge1xyXG4gICAgICAgICAgZW50ZXIocGF0aCkge1xyXG4gICAgICAgICAgICBpZiAocGF0aC5pc0pTWE9wZW5pbmdFbGVtZW50KCkpIHtcclxuICAgICAgICAgICAgICBjb25zdCBvcGVuaW5nTm9kZSA9IHBhdGgubm9kZTtcclxuICAgICAgICAgICAgICBjb25zdCBlbGVtZW50Tm9kZSA9IHBhdGgucGFyZW50UGF0aC5ub2RlOyAvLyBUaGUgSlNYRWxlbWVudCBpdHNlbGZcclxuXHJcbiAgICAgICAgICAgICAgaWYgKCFvcGVuaW5nTm9kZS5sb2MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGNvbnN0IGFscmVhZHlIYXNJZCA9IG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMuc29tZShcclxuICAgICAgICAgICAgICAgIChhdHRyKSA9PiB0LmlzSlNYQXR0cmlidXRlKGF0dHIpICYmIGF0dHIubmFtZS5uYW1lID09PSAnZGF0YS1lZGl0LWlkJ1xyXG4gICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgIGlmIChhbHJlYWR5SGFzSWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiAxOiBJcyB0aGUgY3VycmVudCBlbGVtZW50IHRhZyB0eXBlIGVkaXRhYmxlP1xyXG4gICAgICAgICAgICAgIGNvbnN0IGlzQ3VycmVudEVsZW1lbnRFZGl0YWJsZSA9IGNoZWNrVGFnTmFtZUVkaXRhYmxlKG9wZW5pbmdOb2RlLCBFRElUQUJMRV9IVE1MX1RBR1MpO1xyXG4gICAgICAgICAgICAgIGlmICghaXNDdXJyZW50RWxlbWVudEVkaXRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBsZXQgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDI6IERvZXMgdGhlIGVsZW1lbnQgaGF2ZSBkeW5hbWljIG9yIGVkaXRhYmxlIGNoaWxkcmVuXHJcbiAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudCBoYXMgey4uLnByb3BzfSBzcHJlYWQgYXR0cmlidXRlIC0gZGlzYWJsZSBlZGl0aW5nIGlmIGl0IGRvZXNcclxuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1Byb3BzU3ByZWFkID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5zb21lKGF0dHIgPT4gdC5pc0pTWFNwcmVhZEF0dHJpYnV0ZShhdHRyKSBcclxuICAgICAgICAgICAgICAgICYmIGF0dHIuYXJndW1lbnQgIFxyXG4gICAgICAgICAgICAgICAgJiYgdC5pc0lkZW50aWZpZXIoYXR0ci5hcmd1bWVudCkgXHJcbiAgICAgICAgICAgICAgICAmJiBhdHRyLmFyZ3VtZW50Lm5hbWUgPT09ICdwcm9wcydcclxuICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzRHluYW1pY0NoaWxkID0gZWxlbWVudE5vZGUuY2hpbGRyZW4uc29tZShjaGlsZCA9PlxyXG4gICAgICAgICAgICAgICAgICB0LmlzSlNYRXhwcmVzc2lvbkNvbnRhaW5lcihjaGlsZClcclxuICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGhhc0R5bmFtaWNDaGlsZCB8fCBoYXNQcm9wc1NwcmVhZCkge1xyXG4gICAgICAgICAgICAgICAgICBzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBpZiAoIXNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuICYmIHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzRWRpdGFibGVKc3hDaGlsZCA9IGVsZW1lbnROb2RlLmNoaWxkcmVuLnNvbWUoY2hpbGQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBpZiAodC5pc0pTWEVsZW1lbnQoY2hpbGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrVGFnTmFtZUVkaXRhYmxlKGNoaWxkLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaGFzRWRpdGFibGVKc3hDaGlsZCkge1xyXG4gICAgICAgICAgICAgICAgICBzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICBpZiAoc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXHJcbiAgICAgICAgICAgICAgICAgIHQuanN4SWRlbnRpZmllcignZGF0YS1lZGl0LWRpc2FibGVkJyksXHJcbiAgICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbCgndHJ1ZScpXHJcbiAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgIG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMucHVzaChkaXNhYmxlZEF0dHJpYnV0ZSk7XHJcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiAzOiBQYXJlbnQgaXMgbm9uLWVkaXRhYmxlIGlmIEFUIExFQVNUIE9ORSBjaGlsZCBKU1hFbGVtZW50IGlzIGEgbm9uLWVkaXRhYmxlIHR5cGUuXHJcbiAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbiAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgIGxldCBoYXNOb25FZGl0YWJsZUpzeENoaWxkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgZWxlbWVudE5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmICh0LmlzSlNYRWxlbWVudChjaGlsZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNoZWNrVGFnTmFtZUVkaXRhYmxlKGNoaWxkLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgaWYgKGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuanN4SWRlbnRpZmllcignZGF0YS1lZGl0LWRpc2FibGVkJyksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbChcInRydWVcIilcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBvcGVuaW5nTm9kZS5hdHRyaWJ1dGVzLnB1c2goZGlzYWJsZWRBdHRyaWJ1dGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc0FkZGVkKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IFxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBDb25kaXRpb24gNDogSXMgYW55IGFuY2VzdG9yIEpTWEVsZW1lbnQgYWxzbyBlZGl0YWJsZT9cclxuICAgICAgICAgICAgICBsZXQgY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCA9IHBhdGgucGFyZW50UGF0aC5wYXJlbnRQYXRoO1xyXG4gICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFuY2VzdG9ySnN4RWxlbWVudFBhdGggPSBjdXJyZW50QW5jZXN0b3JDYW5kaWRhdGVQYXRoLmlzSlNYRWxlbWVudCgpXHJcbiAgICAgICAgICAgICAgICAgICAgICA/IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGhcclxuICAgICAgICAgICAgICAgICAgICAgIDogY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aC5maW5kUGFyZW50KHAgPT4gcC5pc0pTWEVsZW1lbnQoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoIWFuY2VzdG9ySnN4RWxlbWVudFBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoY2hlY2tUYWdOYW1lRWRpdGFibGUoYW5jZXN0b3JKc3hFbGVtZW50UGF0aC5ub2RlLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCA9IGFuY2VzdG9ySnN4RWxlbWVudFBhdGgucGFyZW50UGF0aDtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgY29uc3QgbGluZSA9IG9wZW5pbmdOb2RlLmxvYy5zdGFydC5saW5lO1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNvbHVtbiA9IG9wZW5pbmdOb2RlLmxvYy5zdGFydC5jb2x1bW4gKyAxO1xyXG4gICAgICAgICAgICAgIGNvbnN0IGVkaXRJZCA9IGAke3dlYlJlbGF0aXZlRmlsZVBhdGh9OiR7bGluZX06JHtjb2x1bW59YDtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBjb25zdCBpZEF0dHJpYnV0ZSA9IHQuanN4QXR0cmlidXRlKFxyXG4gICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtaWQnKSxcclxuICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbChlZGl0SWQpXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGlkQXR0cmlidXRlKTtcclxuICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoYXR0cmlidXRlc0FkZGVkID4gMCkge1xyXG4gICAgICAgICAgY29uc3QgZ2VuZXJhdGVGdW5jdGlvbiA9IGdlbmVyYXRlLmRlZmF1bHQgfHwgZ2VuZXJhdGU7XHJcbiAgICAgICAgICBjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZUZ1bmN0aW9uKGJhYmVsQXN0LCB7XHJcbiAgICAgICAgICAgIHNvdXJjZU1hcHM6IHRydWUsXHJcbiAgICAgICAgICAgIHNvdXJjZUZpbGVOYW1lOiB3ZWJSZWxhdGl2ZUZpbGVQYXRoXHJcbiAgICAgICAgICB9LCBjb2RlKTtcclxuXHJcbiAgICAgICAgICByZXR1cm4geyBjb2RlOiBvdXRwdXQuY29kZSwgbWFwOiBvdXRwdXQubWFwIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBbdml0ZV1bdmlzdWFsLWVkaXRvcl0gRXJyb3IgdHJhbnNmb3JtaW5nICR7aWR9OmAsIGVycm9yKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcblxyXG4gICAgLy8gVXBkYXRlcyBzb3VyY2UgY29kZSBiYXNlZCBvbiB0aGUgY2hhbmdlcyByZWNlaXZlZCBmcm9tIHRoZSBjbGllbnRcclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcHBseS1lZGl0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgIT09ICdQT1NUJykgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiB7IGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTsgfSk7XHJcblxyXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgbGV0IGFic29sdXRlRmlsZVBhdGggPSAnJztcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZWRpdElkLCBuZXdGdWxsVGV4dCB9ID0gSlNPTi5wYXJzZShib2R5KTtcclxuXHJcbiAgICAgICAgICAgIGlmICghZWRpdElkIHx8IHR5cGVvZiBuZXdGdWxsVGV4dCA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIGVkaXRJZCBvciBuZXdGdWxsVGV4dCcgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBwYXJzZWRJZCA9IHBhcnNlRWRpdElkKGVkaXRJZCk7XHJcbiAgICAgICAgICAgIGlmICghcGFyc2VkSWQpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIGVkaXRJZCBmb3JtYXQgKGZpbGVQYXRoOmxpbmU6Y29sdW1uKScgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCB7IGZpbGVQYXRoLCBsaW5lLCBjb2x1bW4gfSA9IHBhcnNlZElkO1xyXG5cclxuICAgICAgICAgICAgYWJzb2x1dGVGaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShWSVRFX1BST0pFQ1RfUk9PVCwgZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguaW5jbHVkZXMoJy4uJykgfHwgIWFic29sdXRlRmlsZVBhdGguc3RhcnRzV2l0aChWSVRFX1BST0pFQ1RfUk9PVCkgfHwgYWJzb2x1dGVGaWxlUGF0aC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHBhdGgnIH0pKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgsICd1dGYtOCcpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYmFiZWxBc3QgPSBwYXJzZShvcmlnaW5hbENvbnRlbnQsIHtcclxuICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcclxuICAgICAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0J10sXHJcbiAgICAgICAgICAgICAgZXJyb3JSZWNvdmVyeTogdHJ1ZVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGxldCB0YXJnZXROb2RlUGF0aCA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnN0IHZpc2l0b3IgPSB7XHJcbiAgICAgICAgICAgICAgSlNYT3BlbmluZ0VsZW1lbnQocGF0aCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHBhdGgubm9kZTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmxvYyAmJiBub2RlLmxvYy5zdGFydC5saW5lID09PSBsaW5lICYmIG5vZGUubG9jLnN0YXJ0LmNvbHVtbiArIDEgPT09IGNvbHVtbikge1xyXG4gICAgICAgICAgICAgICAgICB0YXJnZXROb2RlUGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgICAgICAgIHBhdGguc3RvcCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdHJhdmVyc2VCYWJlbC5kZWZhdWx0KGJhYmVsQXN0LCB2aXNpdG9yKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZVBhdGgpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdUYXJnZXQgbm9kZSBub3QgZm91bmQgYnkgbGluZS9jb2x1bW4nLCBlZGl0SWQgfSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBnZW5lcmF0ZUZ1bmN0aW9uID0gZ2VuZXJhdGUuZGVmYXVsdCB8fCBnZW5lcmF0ZTtcclxuICAgICAgICAgICAgY29uc3QgcGFyZW50RWxlbWVudE5vZGUgPSB0YXJnZXROb2RlUGF0aC5wYXJlbnRQYXRoPy5ub2RlO1xyXG4gICAgICAgICAgICBsZXQgYmVmb3JlQ29kZSA9ICcnO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnROb2RlICYmIHQuaXNKU1hFbGVtZW50KHBhcmVudEVsZW1lbnROb2RlKSkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGJlZm9yZU91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24ocGFyZW50RWxlbWVudE5vZGUsIHt9KTtcclxuICAgICAgICAgICAgICBiZWZvcmVDb2RlID0gYmVmb3JlT3V0cHV0LmNvZGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBtb2RpZmllZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnROb2RlICYmIHQuaXNKU1hFbGVtZW50KHBhcmVudEVsZW1lbnROb2RlKSkge1xyXG4gICAgICAgICAgICAgIHBhcmVudEVsZW1lbnROb2RlLmNoaWxkcmVuID0gW107XHJcbiAgICAgICAgICAgICAgaWYgKG5ld0Z1bGxUZXh0ICYmIG5ld0Z1bGxUZXh0LnRyaW0oKSAhPT0gJycpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1RleHROb2RlID0gdC5qc3hUZXh0KG5ld0Z1bGxUZXh0KTtcclxuICAgICAgICAgICAgICAgIHBhcmVudEVsZW1lbnROb2RlLmNoaWxkcmVuLnB1c2gobmV3VGV4dE5vZGUpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBtb2RpZmllZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghbW9kaWZpZWQpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwOSwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdDb3VsZCBub3QgYXBwbHkgY2hhbmdlcyB0byBBU1QuJyB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBhZnRlckNvZGUgPSAnJztcclxuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnROb2RlICYmIHQuaXNKU1hFbGVtZW50KHBhcmVudEVsZW1lbnROb2RlKSkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGFmdGVyT3V0cHV0ID0gZ2VuZXJhdGVGdW5jdGlvbihwYXJlbnRFbGVtZW50Tm9kZSwge30pO1xyXG4gICAgICAgICAgICAgIGFmdGVyQ29kZSA9IGFmdGVyT3V0cHV0LmNvZGU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24oYmFiZWxBc3QsIHt9KTtcclxuICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IG91dHB1dC5jb2RlO1xyXG5cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgsIG5ld0NvbnRlbnQsICd1dGYtOCcpOyBcclxuICAgICAgICAgICAgfSBjYXRjaCAod3JpdGVFcnJvcikge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFt2aXRlXVt2aXN1YWwtZWRpdG9yXSBFcnJvciBkdXJpbmcgZGlyZWN0IHdyaXRlIGZvciAke2ZpbGVQYXRofTpgLCB3cml0ZUVycm9yKTtcclxuICAgICAgICAgICAgICB0aHJvdyB3cml0ZUVycm9yO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcclxuICAgICAgICAgICAgICAgIG5ld0ZpbGVDb250ZW50OiBuZXdDb250ZW50LFxyXG4gICAgICAgICAgICAgICAgYmVmb3JlQ29kZSxcclxuICAgICAgICAgICAgICAgIGFmdGVyQ29kZSxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvciBkdXJpbmcgZWRpdCBhcHBsaWNhdGlvbi4nIH0pKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxufSAiLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRhbnltXFxcXE9uZURyaXZlIC0gVW5pdmVyc2lkYWQgSWJlcm9hbWVyaWNhbmEgQS5DLiBBQ0FEXFxcXFVuaVxcXFxBc3RyYVxcXFxXZWJzaXRlXFxcXE9maWNpYWwtUHJpbmNpcGFsXFxcXFBMQU5USUxMQVxcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRhbnltXFxcXE9uZURyaXZlIC0gVW5pdmVyc2lkYWQgSWJlcm9hbWVyaWNhbmEgQS5DLiBBQ0FEXFxcXFVuaVxcXFxBc3RyYVxcXFxXZWJzaXRlXFxcXE9maWNpYWwtUHJpbmNpcGFsXFxcXFBMQU5USUxMQVxcXFxwbHVnaW5zXFxcXHZpc3VhbC1lZGl0b3JcXFxcdmlzdWFsLWVkaXRvci1jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RhbnltL09uZURyaXZlJTIwLSUyMFVuaXZlcnNpZGFkJTIwSWJlcm9hbWVyaWNhbmElMjBBLkMuJTIwQUNBRC9VbmkvQXN0cmEvV2Vic2l0ZS9PZmljaWFsLVByaW5jaXBhbC9QTEFOVElMTEEvcGx1Z2lucy92aXN1YWwtZWRpdG9yL3Zpc3VhbC1lZGl0b3ItY29uZmlnLmpzXCI7ZXhwb3J0IGNvbnN0IFBPUFVQX1NUWUxFUyA9IGBcclxuI2lubGluZS1lZGl0b3ItcG9wdXAge1xyXG4gIHdpZHRoOiAzNjBweDtcclxuICBwb3NpdGlvbjogZml4ZWQ7XHJcbiAgei1pbmRleDogMTAwMDA7XHJcbiAgYmFja2dyb3VuZDogIzE2MTcxODtcclxuICBjb2xvcjogd2hpdGU7XHJcbiAgYm9yZGVyOiAxcHggc29saWQgIzRhNTU2ODtcclxuICBib3JkZXItcmFkaXVzOiAxNnB4O1xyXG4gIHBhZGRpbmc6IDhweDtcclxuICBib3gtc2hhZG93OiAwIDRweCAxMnB4IHJnYmEoMCwwLDAsMC4yKTtcclxuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xyXG4gIGdhcDogMTBweDtcclxuICBkaXNwbGF5OiBub25lO1xyXG59XHJcblxyXG5AbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHtcclxuICAjaW5saW5lLWVkaXRvci1wb3B1cCB7XHJcbiAgICB3aWR0aDogY2FsYygxMDAlIC0gMjBweCk7XHJcbiAgfVxyXG59XHJcblxyXG4jaW5saW5lLWVkaXRvci1wb3B1cC5pcy1hY3RpdmUge1xyXG4gIGRpc3BsYXk6IGZsZXg7XHJcbiAgdG9wOiA1MCU7XHJcbiAgbGVmdDogNTAlO1xyXG4gIHRyYW5zZm9ybTogdHJhbnNsYXRlKC01MCUsIC01MCUpO1xyXG59XHJcblxyXG4jaW5saW5lLWVkaXRvci1wb3B1cC5pcy1kaXNhYmxlZC12aWV3IHtcclxuICBwYWRkaW5nOiAxMHB4IDE1cHg7XHJcbn1cclxuXHJcbiNpbmxpbmUtZWRpdG9yLXBvcHVwIHRleHRhcmVhIHtcclxuICBoZWlnaHQ6IDEwMHB4O1xyXG4gIHBhZGRpbmc6IDRweCA4cHg7XHJcbiAgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XHJcbiAgY29sb3I6IHdoaXRlO1xyXG4gIGZvbnQtZmFtaWx5OiBpbmhlcml0O1xyXG4gIGZvbnQtc2l6ZTogMC44NzVyZW07XHJcbiAgbGluZS1oZWlnaHQ6IDEuNDI7XHJcbiAgcmVzaXplOiBub25lO1xyXG4gIG91dGxpbmU6IG5vbmU7XHJcbn1cclxuXHJcbiNpbmxpbmUtZWRpdG9yLXBvcHVwIC5idXR0b24tY29udGFpbmVyIHtcclxuICBkaXNwbGF5OiBmbGV4O1xyXG4gIGp1c3RpZnktY29udGVudDogZmxleC1lbmQ7XHJcbiAgZ2FwOiAxMHB4O1xyXG59XHJcblxyXG4jaW5saW5lLWVkaXRvci1wb3B1cCAucG9wdXAtYnV0dG9uIHtcclxuICBib3JkZXI6IG5vbmU7XHJcbiAgcGFkZGluZzogNnB4IDE2cHg7XHJcbiAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gIGN1cnNvcjogcG9pbnRlcjtcclxuICBmb250LXNpemU6IDAuNzVyZW07XHJcbiAgZm9udC13ZWlnaHQ6IDcwMDtcclxuICBoZWlnaHQ6IDM0cHg7XHJcbiAgb3V0bGluZTogbm9uZTtcclxufVxyXG5cclxuI2lubGluZS1lZGl0b3ItcG9wdXAgLnNhdmUtYnV0dG9uIHtcclxuICBiYWNrZ3JvdW5kOiAjNjczZGU2O1xyXG4gIGNvbG9yOiB3aGl0ZTtcclxufVxyXG5cclxuI2lubGluZS1lZGl0b3ItcG9wdXAgLmNhbmNlbC1idXR0b24ge1xyXG4gIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50O1xyXG4gIGJvcmRlcjogMXB4IHNvbGlkICMzYjNkNGE7XHJcbiAgY29sb3I6IHdoaXRlO1xyXG5cclxuICAmOmhvdmVyIHtcclxuICAgIGJhY2tncm91bmQ6IzQ3NDk1ODtcclxuICB9XHJcbn1cclxuYDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQb3B1cEhUTUxUZW1wbGF0ZShzYXZlTGFiZWwsIGNhbmNlbExhYmVsKSB7XHJcbiAgcmV0dXJuIGBcclxuICAgIDx0ZXh0YXJlYT48L3RleHRhcmVhPlxyXG4gICAgPGRpdiBjbGFzcz1cImJ1dHRvbi1jb250YWluZXJcIj5cclxuICAgICAgPGJ1dHRvbiBjbGFzcz1cInBvcHVwLWJ1dHRvbiBjYW5jZWwtYnV0dG9uXCI+JHtjYW5jZWxMYWJlbH08L2J1dHRvbj5cclxuICAgICAgPGJ1dHRvbiBjbGFzcz1cInBvcHVwLWJ1dHRvbiBzYXZlLWJ1dHRvblwiPiR7c2F2ZUxhYmVsfTwvYnV0dG9uPlxyXG4gICAgPC9kaXY+XHJcbiAgYDtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBFRElUX01PREVfU1RZTEVTID0gYFxyXG4gICNyb290W2RhdGEtZWRpdC1tb2RlLWVuYWJsZWQ9XCJ0cnVlXCJdIFtkYXRhLWVkaXQtaWRdIHtcclxuICAgIGN1cnNvcjogcG9pbnRlcjsgXHJcbiAgICBvdXRsaW5lOiAxcHggZGFzaGVkICMzNTdERjk7IFxyXG4gICAgb3V0bGluZS1vZmZzZXQ6IDJweDtcclxuICAgIG1pbi1oZWlnaHQ6IDFlbTtcclxuICB9XHJcbiAgI3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0ge1xyXG4gICAgY3Vyc29yOiBwb2ludGVyO1xyXG4gIH1cclxuICAjcm9vdFtkYXRhLWVkaXQtbW9kZS1lbmFibGVkPVwidHJ1ZVwiXSBbZGF0YS1lZGl0LWlkXTpob3ZlciB7XHJcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzU3REY5MzM7XHJcbiAgICBvdXRsaW5lLWNvbG9yOiAjMzU3REY5OyBcclxuICB9XHJcblxyXG4gIEBrZXlmcmFtZXMgZmFkZUluVG9vbHRpcCB7XHJcbiAgICBmcm9tIHtcclxuICAgICAgb3BhY2l0eTogMDtcclxuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDVweCk7XHJcbiAgICB9XHJcbiAgICB0byB7XHJcbiAgICAgIG9wYWNpdHk6IDE7XHJcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSgwKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICNpbmxpbmUtZWRpdG9yLWRpc2FibGVkLXRvb2x0aXAge1xyXG4gICAgZGlzcGxheTogbm9uZTsgXHJcbiAgICBvcGFjaXR5OiAwOyBcclxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgIGJhY2tncm91bmQtY29sb3I6ICMxRDFFMjA7XHJcbiAgICBjb2xvcjogd2hpdGU7XHJcbiAgICBwYWRkaW5nOiA0cHggOHB4O1xyXG4gICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgei1pbmRleDogMTAwMDE7XHJcbiAgICBmb250LXNpemU6IDE0cHg7XHJcbiAgICBib3JkZXI6IDFweCBzb2xpZCAjM0IzRDRBO1xyXG4gICAgbWF4LXdpZHRoOiAxODRweDtcclxuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICB9XHJcblxyXG4gICNpbmxpbmUtZWRpdG9yLWRpc2FibGVkLXRvb2x0aXAudG9vbHRpcC1hY3RpdmUge1xyXG4gICAgZGlzcGxheTogYmxvY2s7XHJcbiAgICBhbmltYXRpb246IGZhZGVJblRvb2x0aXAgMC4ycyBlYXNlLW91dCBmb3J3YXJkcztcclxuICB9XHJcbmA7IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYW55bVxcXFxPbmVEcml2ZSAtIFVuaXZlcnNpZGFkIEliZXJvYW1lcmljYW5hIEEuQy4gQUNBRFxcXFxVbmlcXFxcQXN0cmFcXFxcV2Vic2l0ZVxcXFxPZmljaWFsLVByaW5jaXBhbFxcXFxQTEFOVElMTEFcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkYW55bVxcXFxPbmVEcml2ZSAtIFVuaXZlcnNpZGFkIEliZXJvYW1lcmljYW5hIEEuQy4gQUNBRFxcXFxVbmlcXFxcQXN0cmFcXFxcV2Vic2l0ZVxcXFxPZmljaWFsLVByaW5jaXBhbFxcXFxQTEFOVElMTEFcXFxccGx1Z2luc1xcXFx2aXN1YWwtZWRpdG9yXFxcXHZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvZGFueW0vT25lRHJpdmUlMjAtJTIwVW5pdmVyc2lkYWQlMjBJYmVyb2FtZXJpY2FuYSUyMEEuQy4lMjBBQ0FEL1VuaS9Bc3RyYS9XZWJzaXRlL09maWNpYWwtUHJpbmNpcGFsL1BMQU5USUxMQS9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzXCI7aW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xyXG5pbXBvcnQgeyBFRElUX01PREVfU1RZTEVTIH0gZnJvbSAnLi92aXN1YWwtZWRpdG9yLWNvbmZpZyc7XHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xyXG5jb25zdCBfX2Rpcm5hbWUgPSByZXNvbHZlKF9fZmlsZW5hbWUsICcuLicpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdERldlBsdWdpbigpIHtcclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ3ZpdGU6aW5saW5lLWVkaXQtZGV2JyxcclxuICAgIGFwcGx5OiAnc2VydmUnLFxyXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKCkge1xyXG4gICAgICBjb25zdCBzY3JpcHRQYXRoID0gcmVzb2x2ZShfX2Rpcm5hbWUsICdlZGl0LW1vZGUtc2NyaXB0LmpzJyk7XHJcbiAgICAgIGNvbnN0IHNjcmlwdENvbnRlbnQgPSByZWFkRmlsZVN5bmMoc2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XHJcblxyXG4gICAgICByZXR1cm4gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHRhZzogJ3NjcmlwdCcsXHJcbiAgICAgICAgICBhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG4gICAgICAgICAgY2hpbGRyZW46IHNjcmlwdENvbnRlbnQsXHJcbiAgICAgICAgICBpbmplY3RUbzogJ2JvZHknXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICB0YWc6ICdzdHlsZScsXHJcbiAgICAgICAgICBjaGlsZHJlbjogRURJVF9NT0RFX1NUWUxFUyxcclxuICAgICAgICAgIGluamVjdFRvOiAnaGVhZCdcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGRhbnltXFxcXE9uZURyaXZlIC0gVW5pdmVyc2lkYWQgSWJlcm9hbWVyaWNhbmEgQS5DLiBBQ0FEXFxcXFVuaVxcXFxBc3RyYVxcXFxXZWJzaXRlXFxcXE9maWNpYWwtUHJpbmNpcGFsXFxcXFBMQU5USUxMQVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZGFueW1cXFxcT25lRHJpdmUgLSBVbml2ZXJzaWRhZCBJYmVyb2FtZXJpY2FuYSBBLkMuIEFDQURcXFxcVW5pXFxcXEFzdHJhXFxcXFdlYnNpdGVcXFxcT2ZpY2lhbC1QcmluY2lwYWxcXFxcUExBTlRJTExBXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kYW55bS9PbmVEcml2ZSUyMC0lMjBVbml2ZXJzaWRhZCUyMEliZXJvYW1lcmljYW5hJTIwQS5DLiUyMEFDQUQvVW5pL0FzdHJhL1dlYnNpdGUvT2ZpY2lhbC1QcmluY2lwYWwvUExBTlRJTExBL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyLCBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuXHJcbmNvbnN0IGlzRGV2ID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJztcclxubGV0IGlubGluZUVkaXRQbHVnaW4sIGVkaXRNb2RlRGV2UGx1Z2luO1xyXG5cclxuaWYgKGlzRGV2KSB7XHJcblx0aW5saW5lRWRpdFBsdWdpbiA9IChhd2FpdCBpbXBvcnQoJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMnKSkuZGVmYXVsdDtcclxuXHRlZGl0TW9kZURldlBsdWdpbiA9IChhd2FpdCBpbXBvcnQoJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qcycpKS5kZWZhdWx0O1xyXG59XHJcblxyXG5jb25zdCBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIgPSBgXHJcbmNvbnN0IG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKG11dGF0aW9ucykgPT4ge1xyXG5cdGZvciAoY29uc3QgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XHJcblx0XHRmb3IgKGNvbnN0IGFkZGVkTm9kZSBvZiBtdXRhdGlvbi5hZGRlZE5vZGVzKSB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRhZGRlZE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXHJcblx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0YWRkZWROb2RlLnRhZ05hbWU/LnRvTG93ZXJDYXNlKCkgPT09ICd2aXRlLWVycm9yLW92ZXJsYXknIHx8XHJcblx0XHRcdFx0XHRhZGRlZE5vZGUuY2xhc3NMaXN0Py5jb250YWlucygnYmFja2Ryb3AnKVxyXG5cdFx0XHRcdClcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0aGFuZGxlVml0ZU92ZXJsYXkoYWRkZWROb2RlKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufSk7XHJcblxyXG5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwge1xyXG5cdGNoaWxkTGlzdDogdHJ1ZSxcclxuXHRzdWJ0cmVlOiB0cnVlXHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gaGFuZGxlVml0ZU92ZXJsYXkobm9kZSkge1xyXG5cdGlmICghbm9kZS5zaGFkb3dSb290KSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCBiYWNrZHJvcCA9IG5vZGUuc2hhZG93Um9vdC5xdWVyeVNlbGVjdG9yKCcuYmFja2Ryb3AnKTtcclxuXHJcblx0aWYgKGJhY2tkcm9wKSB7XHJcblx0XHRjb25zdCBvdmVybGF5SHRtbCA9IGJhY2tkcm9wLm91dGVySFRNTDtcclxuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBET01QYXJzZXIoKTtcclxuXHRcdGNvbnN0IGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcob3ZlcmxheUh0bWwsICd0ZXh0L2h0bWwnKTtcclxuXHRcdGNvbnN0IG1lc3NhZ2VCb2R5RWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcubWVzc2FnZS1ib2R5Jyk7XHJcblx0XHRjb25zdCBmaWxlRWxlbWVudCA9IGRvYy5xdWVyeVNlbGVjdG9yKCcuZmlsZScpO1xyXG5cdFx0Y29uc3QgbWVzc2FnZVRleHQgPSBtZXNzYWdlQm9keUVsZW1lbnQgPyBtZXNzYWdlQm9keUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XHJcblx0XHRjb25zdCBmaWxlVGV4dCA9IGZpbGVFbGVtZW50ID8gZmlsZUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XHJcblx0XHRjb25zdCBlcnJvciA9IG1lc3NhZ2VUZXh0ICsgKGZpbGVUZXh0ID8gJyBGaWxlOicgKyBmaWxlVGV4dCA6ICcnKTtcclxuXHJcblx0XHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdFx0dHlwZTogJ2hvcml6b25zLXZpdGUtZXJyb3InLFxyXG5cdFx0XHRlcnJvcixcclxuXHRcdH0sICcqJyk7XHJcblx0fVxyXG59XHJcbmA7XHJcblxyXG5jb25zdCBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIgPSBgXHJcbndpbmRvdy5vbmVycm9yID0gKG1lc3NhZ2UsIHNvdXJjZSwgbGluZW5vLCBjb2xubywgZXJyb3JPYmopID0+IHtcclxuXHRjb25zdCBlcnJvckRldGFpbHMgPSBlcnJvck9iaiA/IEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdG5hbWU6IGVycm9yT2JqLm5hbWUsXHJcblx0XHRtZXNzYWdlOiBlcnJvck9iai5tZXNzYWdlLFxyXG5cdFx0c3RhY2s6IGVycm9yT2JqLnN0YWNrLFxyXG5cdFx0c291cmNlLFxyXG5cdFx0bGluZW5vLFxyXG5cdFx0Y29sbm8sXHJcblx0fSkgOiBudWxsO1xyXG5cclxuXHR3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcclxuXHRcdHR5cGU6ICdob3Jpem9ucy1ydW50aW1lLWVycm9yJyxcclxuXHRcdG1lc3NhZ2UsXHJcblx0XHRlcnJvcjogZXJyb3JEZXRhaWxzXHJcblx0fSwgJyonKTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlciA9IGBcclxuY29uc3Qgb3JpZ2luYWxDb25zb2xlRXJyb3IgPSBjb25zb2xlLmVycm9yO1xyXG5jb25zb2xlLmVycm9yID0gZnVuY3Rpb24oLi4uYXJncykge1xyXG5cdG9yaWdpbmFsQ29uc29sZUVycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xyXG5cclxuXHRsZXQgZXJyb3JTdHJpbmcgPSAnJztcclxuXHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRjb25zdCBhcmcgPSBhcmdzW2ldO1xyXG5cdFx0aWYgKGFyZyBpbnN0YW5jZW9mIEVycm9yKSB7XHJcblx0XHRcdGVycm9yU3RyaW5nID0gYXJnLnN0YWNrIHx8IFxcYFxcJHthcmcubmFtZX06IFxcJHthcmcubWVzc2FnZX1cXGA7XHJcblx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0aWYgKCFlcnJvclN0cmluZykge1xyXG5cdFx0ZXJyb3JTdHJpbmcgPSBhcmdzLm1hcChhcmcgPT4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeShhcmcpIDogU3RyaW5nKGFyZykpLmpvaW4oJyAnKTtcclxuXHR9XHJcblxyXG5cdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xyXG5cdFx0dHlwZTogJ2hvcml6b25zLWNvbnNvbGUtZXJyb3InLFxyXG5cdFx0ZXJyb3I6IGVycm9yU3RyaW5nXHJcblx0fSwgJyonKTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2ggPSBgXHJcbmNvbnN0IG9yaWdpbmFsRmV0Y2ggPSB3aW5kb3cuZmV0Y2g7XHJcblxyXG53aW5kb3cuZmV0Y2ggPSBmdW5jdGlvbiguLi5hcmdzKSB7XHJcblx0Y29uc3QgdXJsID0gYXJnc1swXSBpbnN0YW5jZW9mIFJlcXVlc3QgPyBhcmdzWzBdLnVybCA6IGFyZ3NbMF07XHJcblxyXG5cdC8vIFNraXAgV2ViU29ja2V0IFVSTHNcclxuXHRpZiAodXJsLnN0YXJ0c1dpdGgoJ3dzOicpIHx8IHVybC5zdGFydHNXaXRoKCd3c3M6JykpIHtcclxuXHRcdHJldHVybiBvcmlnaW5hbEZldGNoLmFwcGx5KHRoaXMsIGFyZ3MpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIG9yaWdpbmFsRmV0Y2guYXBwbHkodGhpcywgYXJncylcclxuXHRcdC50aGVuKGFzeW5jIHJlc3BvbnNlID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnQ29udGVudC1UeXBlJykgfHwgJyc7XHJcblxyXG5cdFx0XHQvLyBFeGNsdWRlIEhUTUwgZG9jdW1lbnQgcmVzcG9uc2VzXHJcblx0XHRcdGNvbnN0IGlzRG9jdW1lbnRSZXNwb25zZSA9XHJcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvaHRtbCcpIHx8XHJcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL3hodG1sK3htbCcpO1xyXG5cclxuXHRcdFx0aWYgKCFyZXNwb25zZS5vayAmJiAhaXNEb2N1bWVudFJlc3BvbnNlKSB7XHJcblx0XHRcdFx0XHRjb25zdCByZXNwb25zZUNsb25lID0gcmVzcG9uc2UuY2xvbmUoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGVycm9yRnJvbVJlcyA9IGF3YWl0IHJlc3BvbnNlQ2xvbmUudGV4dCgpO1xyXG5cdFx0XHRcdFx0Y29uc3QgcmVxdWVzdFVybCA9IHJlc3BvbnNlLnVybDtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXFxgRmV0Y2ggZXJyb3IgZnJvbSBcXCR7cmVxdWVzdFVybH06IFxcJHtlcnJvckZyb21SZXN9XFxgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xyXG5cdFx0fSlcclxuXHRcdC5jYXRjaChlcnJvciA9PiB7XHJcblx0XHRcdGlmICghdXJsLm1hdGNoKC9cXC5odG1sPyQvaSkpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycm9yKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhyb3cgZXJyb3I7XHJcblx0XHR9KTtcclxufTtcclxuYDtcclxuXHJcbmNvbnN0IGFkZFRyYW5zZm9ybUluZGV4SHRtbCA9IHtcclxuXHRuYW1lOiAnYWRkLXRyYW5zZm9ybS1pbmRleC1odG1sJyxcclxuXHR0cmFuc2Zvcm1JbmRleEh0bWwoaHRtbCkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0aHRtbCxcclxuXHRcdFx0dGFnczogW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXHJcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zUnVudGltZUVycm9ySGFuZGxlcixcclxuXHRcdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIsXHJcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0JyxcclxuXHRcdFx0XHRcdGF0dHJzOiB7dHlwZTogJ21vZHVsZSd9LFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlcixcclxuXHRcdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxyXG5cdFx0XHRcdFx0YXR0cnM6IHsgdHlwZTogJ21vZHVsZScgfSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBjb25maWdXaW5kb3dGZXRjaE1vbmtleVBhdGNoLFxyXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdLFxyXG5cdFx0fTtcclxuXHR9LFxyXG59O1xyXG5cclxuY29uc29sZS53YXJuID0gKCkgPT4ge307XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoKVxyXG5jb25zdCBsb2dnZXJFcnJvciA9IGxvZ2dlci5lcnJvclxyXG5cclxubG9nZ2VyLmVycm9yID0gKG1zZywgb3B0aW9ucykgPT4ge1xyXG5cdGlmIChvcHRpb25zPy5lcnJvcj8udG9TdHJpbmcoKS5pbmNsdWRlcygnQ3NzU3ludGF4RXJyb3I6IFtwb3N0Y3NzXScpKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRsb2dnZXJFcnJvcihtc2csIG9wdGlvbnMpO1xyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG5cdGN1c3RvbUxvZ2dlcjogbG9nZ2VyLFxyXG5cdHBsdWdpbnM6IFtcclxuXHRcdC4uLihpc0RldiA/IFtpbmxpbmVFZGl0UGx1Z2luKCksIGVkaXRNb2RlRGV2UGx1Z2luKCldIDogW10pLFxyXG5cdFx0cmVhY3QoKSxcclxuXHRcdGFkZFRyYW5zZm9ybUluZGV4SHRtbFxyXG5cdF0sXHJcblx0c2VydmVyOiB7XHJcblx0XHRjb3JzOiB0cnVlLFxyXG5cdFx0aGVhZGVyczoge1xyXG5cdFx0XHQnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdjcmVkZW50aWFsbGVzcycsXHJcblx0XHR9LFxyXG5cdFx0YWxsb3dlZEhvc3RzOiB0cnVlLFxyXG5cdH0sXHJcblx0cmVzb2x2ZToge1xyXG5cdFx0ZXh0ZW5zaW9uczogWycuanN4JywgJy5qcycsICcudHN4JywgJy50cycsICcuanNvbicsIF0sXHJcblx0XHRhbGlhczoge1xyXG5cdFx0XHQnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG5cdFx0fSxcclxuXHR9LFxyXG5cdGJ1aWxkOiB7XHJcblx0XHRyb2xsdXBPcHRpb25zOiB7XHJcblx0XHRcdGV4dGVybmFsOiBbXHJcblx0XHRcdFx0J0BiYWJlbC9wYXJzZXInLFxyXG5cdFx0XHRcdCdAYmFiZWwvdHJhdmVyc2UnLFxyXG5cdFx0XHRcdCdAYmFiZWwvZ2VuZXJhdG9yJyxcclxuXHRcdFx0XHQnQGJhYmVs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QUFBQSxNQUNSLGdDQUFnQztBQUFBLElBQ2pDO0FBQUEsSUFDQSxjQUFjO0FBQUEsRUFDZjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsWUFBWSxDQUFDLFFBQVEsT0FBTyxRQUFRLE9BQU8sT0FBUztBQUFBLElBQ3BELE9BQU87QUFBQSxNQUNOLEtBQUtDLE1BQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDckM7QUFBQSxFQUNEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTixlQUFlO0FBQUEsTUFDZCxVQUFVO0FBQUEsUUFDVDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAiX19kaXJuYW1lIiwgImZpbGVVUkxUb1BhdGgiLCAiX19kaXJuYW1lIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwiLCAiX19maWxlbmFtZSIsICJwYXRoIiwgImlubGluZUVkaXRQbHVnaW4iLCAicGF0aCJdCn0K
