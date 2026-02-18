import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PostsService, PostMeta } from '../../services/posts.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private postsService = inject(PostsService);

  posts = signal<PostMeta[]>([]);

  ngOnInit(): void {
    this.postsService.getPosts().subscribe((posts) => {
      this.posts.set(posts);
    });
  }
}
