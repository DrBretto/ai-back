TRUNCATE TABLE example, example2;

INSERT INTO example (id, user_name, full_name, password,  date_created)
VALUES

  (1, 'Demo', 'Demo', '$2a$12$nWn9FFfvnRYRPeV7nWej.uGITxh347TMwIicz0Y9CkOPvTexO.HM6',  '2020-09-04 19:02:53');

INSERT INTO example2 (id, descript)
VALUES 
  (1, 'Select Material'),
  (2, 'Concrete - unpainted'),
  (3, 'Concrete - painted or sealed');
 