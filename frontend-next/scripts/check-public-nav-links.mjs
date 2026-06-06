#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const navbarPath = path.join(projectRoot, "src/components/layout/PublicNavbar.tsx");
const landingPagePath = path.join(projectRoot, "src/app/landing/page.tsx");

const fail = (message) => {
  console.error(`check-public-nav-links: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(navbarPath)) {
  fail("PublicNavbar file not found.");
}

if (!fs.existsSync(landingPagePath)) {
  fail("Landing page file not found.");
}

const navbarSource = fs.readFileSync(navbarPath, "utf8");
const landingSource = fs.readFileSync(landingPagePath, "utf8");

const landingRouteMatch = navbarSource.match(/const\s+LANDING_ROUTE\s*=\s*['"]([^'"]+)['"]/);
const storeRouteMatch = navbarSource.match(/const\s+STORE_ROUTE\s*=\s*['"]([^'"]+)['"]/);

if (!landingRouteMatch) {
  fail("LANDING_ROUTE constant is missing in PublicNavbar.");
}

if (!storeRouteMatch) {
  fail("STORE_ROUTE constant is missing in PublicNavbar.");
}

const landingRoute = landingRouteMatch[1];
const storeRoute = storeRouteMatch[1];

const sectionIdMatches = [...navbarSource.matchAll(/scrollToSection\('([^']+)'\)/g)];
const sectionIds = Array.from(new Set(sectionIdMatches.map((match) => match[1])));

if (sectionIds.length === 0) {
  fail("No scrollToSection links found in PublicNavbar.");
}

const routeTargets = [landingRoute, storeRoute];

for (const routeTarget of routeTargets) {
  const trimmed = routeTarget.replace(/^\/+/, "");
  const pagePath = path.join(projectRoot, "src/app", trimmed, "page.tsx");
  const pagePathTs = path.join(projectRoot, "src/app", trimmed, "page.ts");

  if (!fs.existsSync(pagePath) && !fs.existsSync(pagePathTs)) {
    fail(`Missing app route target: ${routeTarget}`);
  }
}

for (const sectionId of sectionIds) {
  const sectionPattern = new RegExp(`id=["']${sectionId}["']`);
  if (!sectionPattern.test(landingSource)) {
    fail(`Missing landing section target: #${sectionId}`);
  }
}

console.log("OK: PublicNavbar route and section targets are valid.");
