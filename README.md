## SENAGEST

### PASOS PARA EJECUTAR EL PROYECTO

### 1. Clonar el Repositorio

```bash
    git clone https://github.com/migueldev2006/senagestBack.git
```

### 2. Debemos acceder a la carpeta donde se encuentra nuestro frontend y ejecutar el siguiente comando para instalar las dependencias:

```bash
    npm i 
```
### 3. Debemos crear las variables de entorno basandonos del enn.example el cual dejamos en el proyecto como base para crear el .env A continuacion dejo las variables:

```bash
      #SERVER
      HOST='host'
      PORT='puerto del backend'
      DB_PORT='puerto de la base de dtos'
      FRONTHOST='host del frontend'
      FRONTPORT='puerto del frontend'

      DB_USERNAME='nombre del gestor de la base de datos'
      PASSWORD='contrasena'
      #JWT
      JWT_SECRET = "SECRETO JWT"
      JWT_EXPIRATION = "1w"
      #DATABASE
      DATABASE=senagest
      #MAILER
      MAILER_SERVICE='servicio del email'
      MAILER_USER='cuenta'
      MAILER_PASS='contrasena del servicio de email'
```

### 4. Antes de ejecutar el pryecto debemos asegurarnos que nuestra base de datos ete activa y ejecutandose para ello Doker debe estar ejecutandose y desde la terminal debemos ejecutar el siguiente comando para crear y ejecutar nuetra base de datos:

```bash
    docker compose up --build -d
```

### 5. Luego de verificada ejecutamos el siguiente comando para correr el bacekend del proyecto:


```bash
    npm run strat:dev
```

### Recordatorio
Al proyecto no se le realizo la modificacion del dockerfile, por tanto al pasar a crear la imagen de docker es recomenadble revisar antes de ejecutar.

El proyecto solo se ejecuto en desarrollo.