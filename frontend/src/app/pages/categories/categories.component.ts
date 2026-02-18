import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PostsService, PostMeta } from '../../services/posts.service';

export interface CategoryGroup {
  name: string;
  posts: PostMeta[];
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categories.component.html',
})
export class CategoriesComponent implements OnInit {
  private postsService = inject(PostsService);

  private allPosts = signal<PostMeta[]>([]);

  /** Unique categories derived from all posts, each with its list of posts. */
  categoryGroups = computed<CategoryGroup[]>(() => {
    const map = new Map<string, PostMeta[]>();

    for (const post of this.allPosts()) {
      const cat = post.category?.trim() || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(post);
    }

    // Sort categories alphabetically; posts within each category by date desc
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([name, posts]) => ({
        name,
        posts: posts.sort((a, b) => b.post_date.localeCompare(a.post_date)),
      }));
  });

  totalPosts = computed(() => this.allPosts().length);

  ngOnInit(): void {
    this.postsService.getPosts().subscribe(posts => this.allPosts.set(posts));
  }
}
