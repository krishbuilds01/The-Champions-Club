-- The Champions Club — demo data reset for the PRODUCTION database.
-- Run in Prisma Studio's SQL editor, one statement at a time, in order.
--
-- What it leaves behind: the demo-day dataset from the demo script —
-- the seeded baseline PLUS Dev Malhotra's completed story, so the owner
-- dashboard for "today" reads exactly:
--   Courts ₹4,500 · Shop ₹6,375 · Bar ₹464 · Total ₹11,339
-- Week and month differ from today by the past-30-days history below.
--
-- Dates are relative to CURRENT_DATE (the database's UTC date), while
-- the app reads IST dates — so run this AFTER 05:30 IST, when the two
-- dates agree. Everything is wiped first (all demo tables, including
-- finance, shifts, leave and renewals), so test orders, test tabs and
-- half-finished experiments do not survive.
--
-- Requires the current schema (prisma migrations) to be in place.

TRUNCATE "TabItem","Tab","OrderItem","Order","Booking","Enquiry","Leave","MembershipRenewal","Invoice","Expense","Payroll","Shift","Member","Product","Court","Plan","Staff" RESTART IDENTITY CASCADE;

INSERT INTO "Plan" (code,name,"tennisPrice","cricketPrice","shopDiscount","barDiscount","termDays") VALUES ('gold','Gold',300,500,15,20,365),('silver','Silver',400,650,10,10,180),('junior','Junior',250,400,5,0,365);

INSERT INTO "Court" (name,sport,"walkinPrice") VALUES ('Tennis 1','Tennis',500),('Tennis 2','Tennis',500),('Cricket 1','Cricket',800);

-- Stock already reflects Dev's purchase (racket 12 -> 11, shoes 8 -> 7).
INSERT INTO "Product" (name,price,stock,"lowAt",category) VALUES ('Tennis Racket — ProStaff',4500,11,5,'GEAR'),('Court Shoes',3000,7,5,'GEAR'),('Cricket Bat — English Willow',6000,6,5,'GEAR'),('Tennis Balls (can of 3)',350,40,5,'GEAR'),('Cricket Ball (leather)',500,25,5,'GEAR'),('Club T-Shirt',800,30,5,'GEAR'),('Kit Bag',1800,10,5,'GEAR'),('Wristband Pair',200,50,5,'GEAR'),('Gym Towel',300,3,5,'GEAR'),('Water Bottle 1L',450,0,5,'GEAR'),('Cold Coffee',180,NULL,5,'BAR'),('Protein Shake',250,NULL,5,'BAR'),('Club Sandwich',220,NULL,5,'BAR'),('Masala Fries',150,NULL,5,'BAR'),('Iced Tea',140,NULL,5,'BAR'),('Fresh Lime Soda',120,NULL,5,'BAR');

-- Members: the six regulars plus Dev Malhotra (7), the hero of the demo
-- story. Portal passwords are the phone numbers (bcrypt hashes below).
INSERT INTO "Member" (name,phone,email,"passwordHash","planId","joinedOn","expiresOn") VALUES ('Aarav Mehta','9811000001','aarav.mehta@gmail.com','$2b$10$LblNjeMfi5IKNtFMzVLQB.YePCU7mhBFF3VMEkWZKd1RX7LnM1zCq',1,CURRENT_DATE-90,CURRENT_DATE+240),('Priya Nair','9811000002','priya.nair@gmail.com','$2b$10$PoDzmF/toooH6bYDp8G8G.D4JHmVvCyWm4LUJ2TqhA3KgDJD/QF.m',1,CURRENT_DATE-90,CURRENT_DATE+300),('Rohan Shah','9811000003','rohan.shah@gmail.com','$2b$10$KeA4m5.5cmtucMveYOTrBe.0Jaaxy.8KIlXfEUB4E8j3VltEiMtfq',2,CURRENT_DATE-90,CURRENT_DATE+120),('Sneha Kulkarni','9811000004','sneha.kulkarni@gmail.com','$2b$10$iW8QSWRgXwj5ryXL0NUoRenuRiIgdvajgmrNkg1iYYF0cmO/.Nunu',2,CURRENT_DATE-90,CURRENT_DATE+3),('Kabir Singh','9811000005','kabir.singh@gmail.com','$2b$10$lMNegp9RhaIT37By6FaQNuq.Iz4GW/45PDLZoifpc3cZIBy9JxCa.',3,CURRENT_DATE-90,CURRENT_DATE+200),('Ananya Iyer','9811000006','ananya.iyer@gmail.com','$2b$10$mFlc2Vlcl8rNiALFK7h0se.LYk81iQtTic0wRkNWhFwMjp0o/TlIS',3,CURRENT_DATE-90,CURRENT_DATE-5),('Dev Malhotra','9811000010',NULL,NULL,1,CURRENT_DATE,CURRENT_DATE+365);

-- Today's bookings: the nine seeded (₹4,200) plus Dev's 18:00 Tennis 1
-- booking at the Gold price (₹300) = courts ₹4,500.
INSERT INTO "Booking" ("courtId","memberId",who,phone,date,start,type,price,state,"payMethod","payState") VALUES (1,2,'Priya Nair','',CURRENT_DATE,420,'REGULAR',300,'BOOKED',NULL,'PAID'),(1,3,'Rohan Shah','',CURRENT_DATE,1020,'REGULAR',400,'BOOKED',NULL,'PAID'),(1,5,'Kabir Singh','',CURRENT_DATE,1140,'REGULAR',250,'BOOKED',NULL,'PAID'),(2,NULL,'Walk-in','',CURRENT_DATE,480,'REGULAR',500,'BOOKED',NULL,'PAID'),(2,2,'Priya Nair','',CURRENT_DATE,1080,'REGULAR',300,'BOOKED',NULL,'PAID'),(2,NULL,'Walk-in','',CURRENT_DATE,1140,'REGULAR',500,'BOOKED',NULL,'PAID'),(3,3,'Rohan Shah','',CURRENT_DATE,960,'REGULAR',650,'BOOKED',NULL,'PAID'),(3,1,'Aarav Mehta','',CURRENT_DATE,1080,'REGULAR',500,'BOOKED',NULL,'PAID'),(3,NULL,'Walk-in','',CURRENT_DATE,1200,'REGULAR',800,'BOOKED',NULL,'PAID'),(1,7,'Dev Malhotra','9811000010',CURRENT_DATE,1080,'REGULAR',300,'BOOKED','CASH','PAID');

-- Aarav's open tab on Table 3 (₹400, unpaid — never counts in revenue).
INSERT INTO "Tab" ("memberId",who,"tableNo",status,"planCode","discountPct",subtotal,total) VALUES (1,'Aarav Mehta',3,'OPEN','gold',0,400,400);
INSERT INTO "TabItem" ("tabId","productId",qty,price) VALUES (1,12,1,250),(1,14,1,150);

-- History (past 30 days) so week/month differ from today.
INSERT INTO "Booking" ("courtId","memberId",who,phone,date,start,type,price,state,"payState") VALUES (1,2,'Priya Nair','',CURRENT_DATE-1,420,'REGULAR',300,'BOOKED','PAID'),(3,NULL,'Walk-in','',CURRENT_DATE-1,1020,'REGULAR',800,'BOOKED','PAID'),(2,3,'Rohan Shah','',CURRENT_DATE-3,1080,'REGULAR',400,'BOOKED','PAID'),(1,NULL,'Walk-in','',CURRENT_DATE-3,480,'REGULAR',500,'BOOKED','PAID'),(3,1,'Aarav Mehta','',CURRENT_DATE-6,960,'REGULAR',500,'BOOKED','PAID'),(1,5,'Kabir Singh','',CURRENT_DATE-12,1020,'REGULAR',250,'BOOKED','PAID'),(2,2,'Priya Nair','',CURRENT_DATE-12,420,'REGULAR',300,'BOOKED','PAID'),(3,NULL,'Walk-in','',CURRENT_DATE-20,1080,'REGULAR',800,'BOOKED','PAID'),(2,3,'Rohan Shah','',CURRENT_DATE-20,1140,'REGULAR',400,'BOOKED','PAID');

INSERT INTO "Order" ("memberId",name,phone,subtotal,discount,total,"payMethod","createdAt") VALUES (NULL,'Dev Malhotra','9812000011',700,0,700,'CASH',CURRENT_DATE-1+TIME '12:00'),(2,'Priya Nair','9811000002',800,120,680,'UPI',CURRENT_DATE-4+TIME '12:00'),(NULL,'Walk-in','',3000,0,3000,'CARD',CURRENT_DATE-15+TIME '12:00');
INSERT INTO "OrderItem" ("orderId","productId",qty,price) VALUES (1,4,2,350),(2,6,1,800),(3,2,1,3000);

INSERT INTO "Tab" ("memberId",who,status,"planCode","discountPct",subtotal,total,"payMethod","settledAt") VALUES (NULL,'Walk-in guest','SETTLED','walkin',0,400,400,'CASH',CURRENT_DATE-2+TIME '12:00'),(3,'Rohan Shah','SETTLED','silver',10,400,360,'UPI',CURRENT_DATE-9+TIME '12:00');
INSERT INTO "TabItem" ("tabId","productId",qty,price) VALUES (2,11,1,180),(2,13,1,220),(3,12,1,250),(3,14,1,150);

-- Dev's shop order (id 4): racket + shoes, Gold 15% off, paid by UPI.
INSERT INTO "Order" ("memberId",name,phone,subtotal,discount,total,"payMethod","payState","createdAt") VALUES (7,'Dev Malhotra','9811000010',7500,1125,6375,'UPI','PAID',CURRENT_DATE+TIME '12:00');
INSERT INTO "OrderItem" ("orderId","productId",qty,price) VALUES (4,1,1,4500),(4,2,1,3000);

-- Dev's bar tab (id 4): 2 cold coffees + a sandwich, Gold 20% off, Card.
INSERT INTO "Tab" ("memberId",who,"tableNo",status,"planCode","discountPct",subtotal,total,"payMethod","settledAt") VALUES (7,'Dev Malhotra',5,'SETTLED','gold',20,580,464,'CARD',CURRENT_DATE+TIME '12:00');
INSERT INTO "TabItem" ("tabId","productId",qty,price) VALUES (4,11,2,180),(4,13,1,220);

-- Staff: owner@ signs in with "champions", the rest with "demo1234".
INSERT INTO "Staff" (name,email,"passwordHash",role) VALUES ('Vikram Rao','vikram@champions.club','$2b$10$bYvSCAk4mWZGlOnNcR/SFu1z0AKdVkUqzExCz1ZAG9jZY9fEg/r1G','OWNER'),('Neha Gupta','neha@champions.club','$2b$10$bYvSCAk4mWZGlOnNcR/SFu1z0AKdVkUqzExCz1ZAG9jZY9fEg/r1G','FRONT_DESK'),('Arjun Patel','arjun@champions.club','$2b$10$bYvSCAk4mWZGlOnNcR/SFu1z0AKdVkUqzExCz1ZAG9jZY9fEg/r1G','BAR'),('Meera Joshi','meera@champions.club','$2b$10$bYvSCAk4mWZGlOnNcR/SFu1z0AKdVkUqzExCz1ZAG9jZY9fEg/r1G','SHOP'),('Club Owner','owner@champions.club','$2b$10$NmudCJSTmPef21b9ROO.xeuqubSvpNFRi/zXHV3NtID12UPYfGDfS','OWNER'),('Krishna','techbroyt@gmail.com','$2b$10$MFmhdzW4QLmWPqFUOZRbP.PdYbcr6YzR6X0WEbXVTOKgboCGKqUTa','OWNER');
