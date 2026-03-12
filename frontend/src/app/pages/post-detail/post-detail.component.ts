import { Component, OnInit, inject, signal, ChangeDetectionStrategy, ElementRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MarkdownModule } from 'ngx-markdown';
import { PostsService, PostMeta } from '../../services/posts.service';

@Component({
  selector: 'app-post-detail',
  imports: [MarkdownModule, RouterModule],
  templateUrl: './post-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private postsService = inject(PostsService);
  private meta = inject(Meta);
  private title = inject(Title);
  private el = inject(ElementRef);

  markdownContent = signal<string | null>(null);
  postMeta = signal<PostMeta | null>(null);
  postError = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.loadPost(slug);
      }
    });
  }

  /**
   * Called by (ready) on the <markdown> element.
   * Wraps every <table> inside .markdown-content with a div.table-wrapper
   * so horizontal scroll is scoped to the table only, not the whole page.
   */
  wrapTables(): void {
    const host: HTMLElement = this.el.nativeElement;
    const tables = host.querySelectorAll<HTMLTableElement>('.markdown-content table');
    tables.forEach(table => {
      // Skip if already wrapped
      if (table.parentElement?.classList.contains('table-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode!.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  private loadPost(slug: string): void {
    this.postsService.getPost(slug).subscribe({
      next: (raw) => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\n?/;
        const parsed = this.postsService.parseFrontmatter(slug, raw);
        this.postMeta.set(parsed);

        // Update browser meta tags
        this.title.setTitle(parsed.title);
        this.meta.updateTag({ name: 'title', content: parsed.title });
        this.meta.updateTag({ name: 'description', content: parsed.description });
        if (parsed.cover_image) {
          this.meta.updateTag({ property: 'og:image', content: parsed.cover_image });
        }

        // Strip frontmatter, then rewrite relative image paths to absolute
        const body = raw.replace(frontmatterRegex, '');
        this.markdownContent.set(this.postsService.rewriteImagePaths(slug, body));
      },
      error: () => {
        this.postError.set(true);
        this.postMeta.set({
          slug, title: 'Post Not Found', description: '',
          post_date: '', category: '', read_time: '', creator: '', cover_image: '',
        });
      }
    });
  }
}
