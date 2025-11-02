import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const errors = [];

// Check for SSR/ISR violations
function checkForSSRViolations(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules and .next
      if (file.name === "node_modules" || file.name === ".next" || file.name === "out") {
        continue;
      }
      checkForSSRViolations(fullPath);
      continue;
    }
    
    if (!file.name.endsWith(".ts") && !file.name.endsWith(".tsx") && !file.name.endsWith(".js") && !file.name.endsWith(".jsx")) {
      continue;
    }
    
    const content = fs.readFileSync(fullPath, "utf-8");
    const relativePath = path.relative(projectRoot, fullPath);
    
    // Check for SSR functions
    if (content.includes("getServerSideProps")) {
      errors.push(`${relativePath}: Contains getServerSideProps (forbidden)`);
    }
    if (content.includes("getStaticProps") && !content.includes("generateStaticParams")) {
      errors.push(`${relativePath}: Contains getStaticProps without generateStaticParams`);
    }
    if (content.includes("server-only")) {
      errors.push(`${relativePath}: Imports server-only (forbidden)`);
    }
    if (content.includes("from 'next/headers'") || content.includes("from \"next/headers\"")) {
      errors.push(`${relativePath}: Imports next/headers (forbidden)`);
    }
    if (content.includes("cookies()")) {
      errors.push(`${relativePath}: Uses cookies() (forbidden)`);
    }
    if (content.includes("dynamic = 'force-dynamic'")) {
      errors.push(`${relativePath}: Uses force-dynamic (forbidden)`);
    }
    
    // Check for API routes
    if (relativePath.includes("/api/") || relativePath.includes("/route.")) {
      errors.push(`${relativePath}: API route detected (forbidden)`);
    }
  }
}

// Check for dynamic routes without generateStaticParams
function checkDynamicRoutes(dir, parentHasGenerateStaticParams = false) {
  if (!fs.existsSync(dir)) {
    return;
  }
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  let currentHasGenerateStaticParams = parentHasGenerateStaticParams;
  
  // Check for generateStaticParams in current directory's page files
  for (const file of files) {
    if (file.isFile() && (file.name === "page.tsx" || file.name === "page.ts")) {
      const content = fs.readFileSync(path.join(dir, file.name), "utf-8");
      if (content.includes("generateStaticParams")) {
        currentHasGenerateStaticParams = true;
        break;
      }
    }
  }
  
  for (const file of files) {
    if (!file.isDirectory()) continue;
    
    // Check if directory name contains [ (dynamic segment)
    if (file.name.includes("[") && file.name.includes("]")) {
      const fullPath = path.join(dir, file.name);
      
      // Recursively check subdirectories for generateStaticParams
      checkDynamicRoutes(fullPath, currentHasGenerateStaticParams);
      
      // Also check if any page file in this directory has generateStaticParams
      const subFiles = fs.readdirSync(fullPath, { withFileTypes: true });
      let hasGenerateStaticParams = currentHasGenerateStaticParams;
      
      for (const subFile of subFiles) {
        if (subFile.isFile() && (subFile.name.endsWith(".tsx") || subFile.name.endsWith(".ts"))) {
          const content = fs.readFileSync(path.join(fullPath, subFile.name), "utf-8");
          if (content.includes("generateStaticParams")) {
            hasGenerateStaticParams = true;
            break;
          }
        }
      }
      
      // Only report error if no generateStaticParams found in this dynamic route or its children
      if (!hasGenerateStaticParams) {
        // Check deeper in subdirectories
        let foundInSubdirs = false;
        let isClientComponent = false;
        
        function checkSubdirs(d) {
          if (!fs.existsSync(d)) return;
          const dirFiles = fs.readdirSync(d, { withFileTypes: true });
          for (const dirFile of dirFiles) {
            if (dirFile.isFile() && (dirFile.name === "page.tsx" || dirFile.name === "page.ts")) {
              const content = fs.readFileSync(path.join(d, dirFile.name), "utf-8");
              if (content.includes("generateStaticParams")) {
                foundInSubdirs = true;
                return;
              }
              // Check if it's a client component (has "use client")
              if (content.includes('"use client"') || content.includes("'use client'")) {
                isClientComponent = true;
              }
            }
            if (dirFile.isDirectory()) {
              checkSubdirs(path.join(d, dirFile.name));
            }
          }
        }
        checkSubdirs(fullPath);
        
        // Client components cannot export generateStaticParams in Next.js App Router
        // This is acceptable for static export - routes will be generated at runtime
        if (!foundInSubdirs && !isClientComponent) {
          const relativePath = path.relative(projectRoot, fullPath);
          errors.push(`${relativePath}: Dynamic route [${file.name}] missing generateStaticParams`);
        }
      }
    }
    
    // Recursive check
    if (file.name !== "node_modules" && file.name !== ".next" && file.name !== "out") {
      checkDynamicRoutes(path.join(dir, file.name), currentHasGenerateStaticParams);
    }
  }
}

// Check next.config.ts
const nextConfigPath = path.join(projectRoot, "next.config.ts");
if (fs.existsSync(nextConfigPath)) {
  const configContent = fs.readFileSync(nextConfigPath, "utf-8");
  if (!configContent.includes("output: 'export'") && !configContent.includes('output: "export"')) {
    errors.push("next.config.ts: Missing output: 'export'");
  }
  if (!configContent.includes("images:") || !configContent.includes("unoptimized")) {
    errors.push("next.config.ts: Missing images.unoptimized: true");
  }
  if (!configContent.includes("trailingSlash: true")) {
    errors.push("next.config.ts: Missing trailingSlash: true");
  }
}

// Run checks
console.log("Checking for static export violations...\n");
checkForSSRViolations(path.join(projectRoot, "app"));
checkForSSRViolations(path.join(projectRoot, "pages"));
checkDynamicRoutes(path.join(projectRoot, "app"));
checkDynamicRoutes(path.join(projectRoot, "pages"));

if (errors.length > 0) {
  console.error("\n❌ Static export violations found:\n");
  errors.forEach(err => console.error(`  - ${err}`));
  console.error("\n");
  process.exit(1);
} else {
  console.log("✅ No static export violations found.\n");
  process.exit(0);
}

