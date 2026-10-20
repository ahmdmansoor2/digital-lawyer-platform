#!/usr/bin/env node
/**
 * scripts/generate-sitemap.cjs — Unified Sitemap Generator Caller
 * Delegates directly to scripts/blog-publisher/generate-sitemap.cjs
 * ensuring zero duplicate logic, zero 301 collisions, and full tier-1 support.
 */
'use strict';

require('./blog-publisher/generate-sitemap.cjs');
