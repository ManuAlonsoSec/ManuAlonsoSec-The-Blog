import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { MarkdownModule } from 'ngx-markdown';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, MarkdownModule, RouterModule],
  templateUrl: './post-detail.component.html',
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private meta = inject(Meta);
  private title = inject(Title);
  
  postUrl: string | null = null;
  postTitle: string = '';

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.postUrl = `/assets/content/${slug}.md`;
      }
    });
  }

  onLoad(data: string) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = data.match(frontmatterRegex);

    if (match) {
      const frontmatter = match[1];
      const titleMatch = frontmatter.match(/title:\s*["']?(.*?)["']?$/m);
      const descMatch = frontmatter.match(/description:\s*["']?(.*?)["']?$/m);

      if (titleMatch) {
        this.postTitle = titleMatch[1];
        this.title.setTitle(titleMatch[1]);
        this.meta.updateTag({ name: 'title', content: titleMatch[1] });
      }
      if (descMatch) {
        this.meta.updateTag({ name: 'description', content: descMatch[1] });
      }
    }
  }

  onError(error: any) {
    console.error('Error loading markdown:', error);
    this.postUrl = null; 
    this.postTitle = 'Post Not Found';
  }
}
