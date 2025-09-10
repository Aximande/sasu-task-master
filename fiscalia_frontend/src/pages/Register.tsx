/**
 * Registration page component
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  BusinessCenter,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  full_name?: string;
  phone?: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        phone: data.phone,
      });
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the store
    }
  };

  React.useEffect(() => {
    clearError();
  }, [clearError]);

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <BusinessCenter sx={{ mr: 1, color: 'primary.main', fontSize: 40 }} />
            <Typography component="h1" variant="h4" fontWeight="bold">
              FiscalIA Pro
            </Typography>
          </Box>

          <Typography component="h2" variant="h6" sx={{ mb: 3 }}>
            Créer un compte
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Adresse email"
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                  {...register('email', {
                    required: 'Email requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide',
                    },
                  })}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  fullWidth
                  id="full_name"
                  label="Nom complet"
                  autoComplete="name"
                  error={!!errors.full_name}
                  helperText={errors.full_name?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                  {...register('full_name', {
                    minLength: {
                      value: 2,
                      message: 'Le nom doit contenir au moins 2 caractères',
                    },
                  })}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  fullWidth
                  id="phone"
                  label="Téléphone"
                  autoComplete="tel"
                  error={!!errors.phone}
                  helperText={errors.phone?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                  {...register('phone', {
                    pattern: {
                      value: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
                      message: 'Numéro de téléphone invalide',
                    },
                  })}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  required
                  fullWidth
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  {...register('password', {
                    required: 'Mot de passe requis',
                    minLength: {
                      value: 8,
                      message: 'Le mot de passe doit contenir au moins 8 caractères',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                      message:
                        'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
                    },
                  })}
                />
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <TextField
                  required
                  fullWidth
                  label="Confirmer le mot de passe"
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  {...register('confirmPassword', {
                    required: 'Veuillez confirmer votre mot de passe',
                    validate: (value) =>
                      value === password || 'Les mots de passe ne correspondent pas',
                  })}
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : "S'inscrire"}
            </Button>

            <Divider sx={{ my: 2 }}>OU</Divider>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                Déjà un compte ?{' '}
                <Link to="/login" style={{ textDecoration: 'none' }}>
                  <Typography
                    component="span"
                    variant="body2"
                    color="primary"
                    sx={{ cursor: 'pointer' }}
                  >
                    Se connecter
                  </Typography>
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
          En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de
          confidentialité
        </Typography>
      </Box>
    </Container>
  );
};

export default Register;