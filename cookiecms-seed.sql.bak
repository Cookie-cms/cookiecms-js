-- Seed for `users`
INSERT INTO `users` (`id`, `username`, `dsid`, `mail`, `mail_verify`, `uuid`, `password`, `perms`, `accessToken`, `serverID`, `hwidId`)
VALUES 
(1, 'user1', null, 'user1@example.com', 1, '550e8400-e29b-41d4-a716-446655440000', 'password123', 1, 'abcdef1234567890', 'server1', 1),
(2, 'user2', null, 'user2@example.com', 0, '550e8400-e29b-41d4-a716-446655440001', 'password456', 2, 'ghijk1234567890', 'server2', 2);

-- Seed for `cloaks_lib`
INSERT INTO `cloaks_lib` (`uuid`, `name`)
VALUES 
('uuid-12345', 'Cloak One'),
('uuid-67890', 'Cloak Two');

-- Seed for `cloaks_users`
INSERT INTO `cloaks_users` (`uid`, `cloak_id`)
VALUES 
(1, 'uuid-12345'),
(2, 'uuid-67890');


-- Seed for `skin_user`
INSERT INTO `skin_user` (`uid`, `skin_id`)
VALUES 
(1, 'skin12345'),
(2, 'skin67890');

-- Seed for `skins_library`
INSERT INTO `skins_library` (`uuid`, `name`, `ownerid`, `slim`, `hd`, `disabled`, `cloak_id`)
VALUES 
('skin12345', 'Skin One', 1, 0, 1, 0, 0),
('skin67890', 'Skin Two', 2, 1, 0, 0, 1);

-- Seed for `user_permissions`
INSERT INTO `user_permissions` (`uuid`, `name`)
VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Admin'),
('550e8400-e29b-41d4-a716-446655440001', 'User');

-- Seed for `verify_codes`
INSERT INTO `verify_codes` (`userid`, `code`, `action`, `expire`)
VALUES 
(1, '1', 1, 1633072800),
(2, '2', 2, 1633076400);
