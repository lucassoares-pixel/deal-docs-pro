import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the calling user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    ).auth.getUser(token);

    if (authError || !callerUser) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is admin
    const { data: callerProfile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerenciar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { email, password, name, role, cpf, phone } = body;

      if (!email || !password || !name || !role) {
        return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, password, name, role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create auth user
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error('Create user error:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update profile with role, cpf, phone (trigger already creates the profile)
      // Small delay to let trigger fire
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ role, cpf: cpf || null, phone: phone || null })
        .eq('user_id', newUser.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      console.log(`User created: ${email} with role: ${role}`);

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'update') {
      const { user_id, name, role, cpf, phone, active } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (cpf !== undefined) updates.cpf = cpf || null;
      if (phone !== undefined) updates.phone = phone || null;
      if (active !== undefined) updates.active = active;

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('user_id', user_id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`User updated: ${user_id}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'reset_password') {
      const { user_id, new_password } = body;

      if (!user_id || !new_password) {
        return new Response(JSON.stringify({ error: 'user_id e new_password são obrigatórios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: resetError } = await supabaseClient.auth.admin.updateUserById(user_id, {
        password: new_password,
      });

      if (resetError) {
        console.error('Password reset error:', resetError);
        return new Response(JSON.stringify({ error: resetError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Password reset for user: ${user_id}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Ação inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
