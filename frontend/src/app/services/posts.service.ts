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
   * Rewrites relative image paths inside markdown body to absolute paths
   * so that `![alt](images/foo.png)` becomes `![alt](/assets/content/{slug}/images/foo.png)`.
   * Uses [^)]+ to handle filenames that may contain spaces.
   * Leaves already-absolute paths (http:// or root-relative /) untouched.
   */
  rewriteImagePaths(slug: string, markdown: string): string {
    const base = `${this.contentBase}/${slug}/`;
    return markdown.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (_match, alt, src) => {
        if (src.startsWith('http') || src.startsWith('/')) return `![${alt}](${src})`;
        return `![${alt}](${base}${src})`;
      }
    );
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
