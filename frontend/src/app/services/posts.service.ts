import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, switchMap, map } from 'rxjs';

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  post_date: string;
  category: string;
  read_time: string;
  creator: string;
  /** Resolved absolute URL to the cover image, or empty string if not set. */
  cover_image: string;
}

@Injectable({ providedIn: 'root' })
export class PostsService {
  private http = inject(HttpClient);
  private contentBase = '/assets/content';

  /** Loads all posts from the manifest and parses their frontmatter. */
  getPosts(): Observable<PostMeta[]> {
    return this.http
      .get<string[]>(`${this.contentBase}/posts-manifest.json`)
      .pipe(
        switchMap((slugs) =>
          forkJoin(
            slugs.map((slug) =>
              this.http
                .get(`${this.contentBase}/${slug}/index.md`, { responseType: 'text' })
                .pipe(map((raw) => this.parseFrontmatter(slug, raw)))
            )
          )
        )
      );
  }

  /** Fetches a single post's raw markdown. */
  getPost(slug: string): Observable<string> {
    return this.http.get(`${this.contentBase}/${slug}/index.md`, { responseType: 'text' });
  }

  /**
   * Rewrites relative image paths to absolute, and optionally applies size hints.
   *
   * Supported syntax (standard Markdown title attribute):
   *   ![alt](images/photo.png)            → natural width
   *   ![alt](images/photo.png "500x300")  → width:500px height:300px
   *   ![alt](images/photo.png "300")      → width:300px, height:auto
   *   ![alt](images/photo.png "50%")      → width:50%
   *
   * Leaves already-absolute paths (http:// or root-relative /) untouched.
   */
  rewriteImagePaths(slug: string, markdown: string): string {
    const base = `${this.contentBase}/${slug}/`;

    // Matches: ![alt](src) or ![alt](src "title") or ![alt](src 'title')
    return markdown.replace(
      /!\[([^\]]*)\]\(([^"')]+?)(?:\s+["']([^"']*)["'])?\s*\)/g,
      (_match, alt, src, title) => {
        // Resolve path
        const resolvedSrc =
          src.startsWith('http') || src.startsWith('/')
            ? src.trim()
            : `${base}${src.trim()}`;

        // Parse size hint from title, e.g. "500x300", "300", "50%"
        const sizeStyle = this.parseSizeHint(title);

        if (sizeStyle) {
          // Emit a raw <img> tag so we can apply inline styles
          return `<img src="${resolvedSrc}" alt="${alt}" style="${sizeStyle}" class="post-image" />`;
        }

        // No size hint — keep standard markdown image syntax
        return `![${alt}](${resolvedSrc})`;
      }
    );
  }

  /**
   * Parses a size hint string and returns a CSS style string, or null if not a size hint.
   *   "500x300" → "width:500px;height:300px"
   *   "300"     → "width:300px"
   *   "50%"     → "width:50%"
   */
  private parseSizeHint(title: string | undefined): string | null {
    if (!title) return null;
    const t = title.trim();

    // WxH in pixels, e.g. "800x450"
    const wxh = t.match(/^(\d+)x(\d+)$/);
    if (wxh) return `width:${wxh[1]}px;height:${wxh[2]}px;max-width:100%`;

    // Single pixel value, e.g. "400"
    const px = t.match(/^(\d+)$/);
    if (px) return `width:${px[1]}px;max-width:100%`;

    // Percentage, e.g. "50%"
    const pct = t.match(/^(\d+)%$/);
    if (pct) return `width:${pct[1]}%`;

    return null; // Not a size hint — treat as a regular title
  }

  /** Resolves a relative cover_image path from frontmatter to an absolute URL. */
  resolveCoverImage(slug: string, relativePath: string): string {
    if (!relativePath) return '';
    // Already absolute (external URL or root-relative)
    if (relativePath.startsWith('http') || relativePath.startsWith('/')) {
      return relativePath;
    }
    return `${this.contentBase}/${slug}/${relativePath}`;
  }

  /** Extracts YAML frontmatter fields from a markdown string. */
  parseFrontmatter(slug: string, raw: string): PostMeta {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);

    const extract = (block: string, key: string): string => {
      const m = block.match(new RegExp(`^${key}:\\s*['"]?(.*?)['"]?\\s*$`, 'm'));
      return m ? m[1] : '';
    };

    if (match) {
      const block = match[1];
      const rawCoverImage = extract(block, 'cover_image');
      return {
        slug,
        title:       extract(block, 'title')       || slug,
        description: extract(block, 'description'),
        post_date:   extract(block, 'post_date'),
        category:    extract(block, 'category'),
        read_time:   extract(block, 'read_time'),
        creator:     extract(block, 'creator'),
        cover_image: this.resolveCoverImage(slug, rawCoverImage),
      };
    }

    return {
      slug, title: slug, description: '',
      post_date: '', category: '', read_time: '', creator: '', cover_image: '',
    };
  }
}
