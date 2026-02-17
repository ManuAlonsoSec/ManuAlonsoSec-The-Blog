import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-post-detail',
  imports: [MarkdownModule, RouterModule],
  templateUrl: './post-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private meta = inject(Meta);
  private title = inject(Title);

  markdownContent = signal<string | null>(null);
  postTitle = signal('');
  postError = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.loadPost(`/assets/content/${slug}.md`);
      }
    });
  }

  private loadPost(url: string): void {
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (raw) => {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
        const match = raw.match(frontmatterRegex);

        if (match) {
          const frontmatter = match[1];
          const titleMatch = frontmatter.match(/title:\s*["']?(.*?)["']?$/m);
          const descMatch = frontmatter.match(/description:\s*["']?(.*?)["']?$/m);

          if (titleMatch) {
            this.postTitle.set(titleMatch[1]);
            this.title.setTitle(titleMatch[1]);
            this.meta.updateTag({ name: 'title', content: titleMatch[1] });
          }
          if (descMatch) {
            this.meta.updateTag({ name: 'description', content: descMatch[1] });
          }

          // Strip frontmatter from the content
          this.markdownContent.set(raw.replace(frontmatterRegex, ''));
        } else {
          this.markdownContent.set(raw);
        }
      },
      error: () => {
        this.postError.set(true);
        this.postTitle.set('Post Not Found');
      }
    });
  }
}
