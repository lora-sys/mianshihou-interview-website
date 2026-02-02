-- sql/init.sql
-- 安装 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;
 
-- 用户表
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    userAccount VARCHAR(256) NOT NULL UNIQUE,
    userPassword VARCHAR(512) NOT NULL,
    unionId VARCHAR(256),
    mpOpenId VARCHAR(256),
    userName VARCHAR(256),
    userAvatar VARCHAR(1024),
    userProfile VARCHAR(512),
    userRole VARCHAR(256) DEFAULT 'user' NOT NULL,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isDelete BOOLEAN DEFAULT false NOT NULL
);
 
CREATE INDEX idx_user_unionId ON "user"(unionId);
 

 
-- 帖子表
CREATE TABLE IF NOT EXISTS post (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(512),
    content TEXT,
    tags VARCHAR(1024),
    thumbNum INTEGER DEFAULT 0 NOT NULL,
    favourNum INTEGER DEFAULT 0 NOT NULL,
    userId BIGINT NOT NULL,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isDelete BOOLEAN DEFAULT false NOT NULL
);
 
CREATE INDEX idx_post_userId ON post(userId);
 
-- 帖子点赞表
CREATE TABLE IF NOT EXISTS post_thumb (
    id BIGSERIAL PRIMARY KEY,
    postId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 
CREATE INDEX idx_postThumb_postId ON post_thumb(postId);
CREATE INDEX idx_postThumb_userId ON post_thumb(userId);
 
-- 帖子收藏表
CREATE TABLE IF NOT EXISTS post_favour (
    id BIGSERIAL PRIMARY KEY,
    postId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
 
CREATE INDEX idx_postFavour_postId ON post_favour(postId);
CREATE INDEX idx_postFavour_userId ON post_favour(userId);