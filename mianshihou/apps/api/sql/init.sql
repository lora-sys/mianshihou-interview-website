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
 
-- 题目表
CREATE TABLE IF NOT EXISTS question (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    answer TEXT,
    userId INTEGER NOT NULL,
    questionBankId INTEGER,
    editTime TIMESTAMP,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isDelete BOOLEAN DEFAULT false NOT NULL,
    embedding vector(1536)  -- 为AI功能预留
);
 
CREATE INDEX idx_question_userId ON question(userId);
CREATE INDEX idx_question_questionBankId ON question(questionBankId);
CREATE INDEX idx_question_embedding ON question USING hnsw (embedding vector_cosine_ops);
 
-- 题库表
CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    picture TEXT,
    userId INTEGER NOT NULL,
    questionCount INTEGER DEFAULT 0,
    editTime TIMESTAMP,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isDelete BOOLEAN DEFAULT false NOT NULL
);
 
CREATE INDEX idx_questionBank_userId ON question_bank(userId);
 
-- 题库题目关联表
CREATE TABLE IF NOT EXISTS question_bank_question (
    id SERIAL PRIMARY KEY,
    questionBankId INTEGER NOT NULL,
    questionId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    createTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    isDelete BOOLEAN DEFAULT false NOT NULL
);
 
CREATE INDEX idx_questionBankQuestion_questionBankId ON question_bank_question(questionBankId);
CREATE INDEX idx_questionBankQuestion_questionId ON question_bank_question(questionId);
 
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