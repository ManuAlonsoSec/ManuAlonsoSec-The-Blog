import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
