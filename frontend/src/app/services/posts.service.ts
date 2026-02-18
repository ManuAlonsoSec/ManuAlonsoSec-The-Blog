import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, switchMap, map } from 'rxjs';

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
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
                .get(`${this.contentBase}/${slug}.md`, { responseType: 'text' })
                .pipe(map((raw) => this.parseFrontmatter(slug, raw)))
            )
          )
        )
      );
  }

  /** Extracts YAML frontmatter fields (title, description) from a markdown string. */
  private parseFrontmatter(slug: string, raw: string): PostMeta {
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    let title = slug;
    let description = '';

    if (match) {
      const block = match[1];
      const titleMatch = block.match(/^title:\s*['"]?(.*?)['"]?\s*$/m);
      const descMatch = block.match(/^description:\s*['"]?(.*?)['"]?\s*$/m);
      if (titleMatch) title = titleMatch[1];
      if (descMatch) description = descMatch[1];
    }

    return { slug, title, description };
  }
}
