'use strict';

let raw = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  raw += chunk;
});

process.stdin.on('end', () => {
  let input;

  try {
    input = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }

  const toolName = String(input.tool_name || '');
  const toolInput = input.tool_input || {};
  const command = String(toolInput.command || '');
  const payload = JSON.stringify(toolInput).toLowerCase();

  const deny = reason => {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason
      }
    }));
  };

  if (toolName === 'Bash') {
    const blockedPatterns = [
      /\b(rm|rmdir|del|erase|unlink)\b/i,
      /\b(mv|move|cp|copy|touch|mkdir)\b/i,
      /\b(set-content|add-content|out-file|new-item|remove-item|move-item|copy-item)\b/i,
      /(^|[^|])>{1,2}(?![>&])/,
      /\bsed\s+-i\b/i,
      /\bperl\s+-pi\b/i,
      /\bgit\s+(add|commit|push|pull|merge|rebase|reset|restore|checkout|switch|clean|stash|cherry-pick|revert|tag)\b/i,
      /\b(npm|pnpm|yarn)\s+(install|add|remove|update|upgrade|build|publish)\b/i,
      /\bnpx\s+supabase\s+(db\s+(push|reset)|migration\s+new|functions\s+deploy|link)\b/i,
      /\bsupabase\s+(db\s+(push|reset)|migration\s+new|functions\s+deploy|link)\b/i,
      /\bpsql\b[\s\S]*\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke)\b/i
    ];

    if (blockedPatterns.some(pattern => pattern.test(command))) {
      deny(
        'ALLDENT investigator is read-only. This Bash command may modify files, Git, packages, Supabase, or data.'
      );
      return;
    }
  }

  if (/^mcp__/.test(toolName)) {
    const mutationWords = [
      '"insert"',
      '"update"',
      '"delete"',
      '"upsert"',
      '"create"',
      '"alter"',
      '"drop"',
      '"truncate"',
      '"execute_sql"',
      '"apply_migration"',
      '"deploy"',
      '"write"',
      '"remove"'
    ];

    if (mutationWords.some(word => payload.includes(word))) {
      deny(
        'ALLDENT investigator may use MCP tools only for read-only inspection. Mutation-like MCP operation blocked.'
      );
      return;
    }
  }

  process.exit(0);
});
